import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Image,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
  type UploadFile,
} from "antd"
import { FileImage, Plus, ScanLine, Trash2, UploadCloud } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  advancedMenuApi,
  showApiError,
  type MenuImport as MenuImportRecord,
  type MenuImportDraft,
  type MenuImportDraftItem,
} from "../../api"
import { API_BASE_URL } from "../../config"
import { money } from "../../data"
import { useAppStore } from "../../store"
import { palette } from "../../theme"

const backendOrigin = API_BASE_URL.replace(/\/api(?:\/v\d+)?\/?$/, "")
const importKey = (chainId: string) => `smartfnb_menu_import_${chainId}`

export default function MenuImport() {
  const { message, modal } = App.useApp()
  const chainId = useAppStore((state) => state.chainId)
  const branches = useAppStore((state) => state.branches)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [record, setRecord] = useState<MenuImportRecord | null>(null)
  const [draft, setDraft] = useState<MenuImportDraft | null>(null)
  const [detailEditor, setDetailEditor] = useState<{
    categoryIndex: number
    itemIndex: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const detailItem =
    detailEditor && draft
      ? draft.categories[detailEditor.categoryIndex]?.items[
          detailEditor.itemIndex
        ]
      : undefined

  const refresh = useCallback(
    async (id: string) => {
      if (!chainId) return
      try {
        const next = await advancedMenuApi.getMenuImport(chainId, id)
        setRecord(next)
        if (next.draft) setDraft(next.draft)
        if (["IMPORTED", "FAILED", "CANCELLED"].includes(next.status)) {
          localStorage.removeItem(importKey(chainId))
        }
      } catch (error) {
        showApiError(message.error, error, "Không tải được lượt nhập menu")
      }
    },
    [chainId, message],
  )

  useEffect(() => {
    if (!chainId) return
    const id = localStorage.getItem(importKey(chainId))
    if (id) void refresh(id)
  }, [chainId, refresh])

  useEffect(() => {
    if (!record || record.status !== "PROCESSING") return
    const timer = window.setInterval(() => void refresh(record.id), 3000)
    return () => window.clearInterval(timer)
  }, [record, refresh])

  const start = async () => {
    if (!chainId) return
    const selected = files
      .map((file) => file.originFileObj)
      .filter((file): file is NonNullable<typeof file> => Boolean(file))
    if (!selected.length) return message.warning("Chọn từ 1 đến 5 ảnh menu")
    try {
      setBusy(true)
      const next = await advancedMenuApi.createMenuImport(chainId, selected)
      localStorage.setItem(importKey(chainId), next.id)
      setRecord(next)
      setDraft(null)
    } catch (error) {
      showApiError(message.error, error, "Không bắt đầu được nhận dạng menu")
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (!chainId || !record || !draft) return
    try {
      setBusy(true)
      const next = await advancedMenuApi.updateMenuImportDraft(
        chainId,
        record.id,
        draft,
      )
      setRecord(next)
      message.success("Đã lưu bản nháp")
    } catch (error) {
      showApiError(message.error, error, "Không lưu được bản nháp")
    } finally {
      setBusy(false)
    }
  }

  const commit = () => {
    if (!chainId || !record || !draft) return
    modal.confirm({
      title: "Nhập bản nháp vào menu toàn chuỗi?",
      content:
        "Hệ thống chỉ ghi các dòng Tạo mới hoặc Cập nhật giá. Thao tác này được ghi audit log và không thể hoàn tác tự động.",
      okText: "Nhập vào menu",
      cancelText: "Kiểm tra lại",
      onOk: async () => {
        try {
          setBusy(true)
          await advancedMenuApi.updateMenuImportDraft(chainId, record.id, draft)
          const next = await advancedMenuApi.commitMenuImport(
            chainId,
            record.id,
          )
          setRecord(next)
          localStorage.removeItem(importKey(chainId))
          message.success("Đã nhập menu thành công")
        } catch (error) {
          showApiError(message.error, error, "Không nhập được menu")
          throw error
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const reset = () => {
    setRecord(null)
    setDraft(null)
    setFiles([])
    if (chainId) localStorage.removeItem(importKey(chainId))
  }

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ marginBottom: 18 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Nhập menu từ ảnh
        </Typography.Title>
        <Typography.Text type="secondary">
          OCR đọc chữ, AI tạo bản nháp; chỉ ghi menu sau khi Brand Manager kiểm
          tra và xác nhận (OW-12)
        </Typography.Text>
      </div>

      {!record && (
        <Upload.Dragger
          multiple
          accept="image/jpeg,image/png,image/webp"
          fileList={files}
          maxCount={5}
          beforeUpload={() => false}
          onChange={({ fileList }) => setFiles(fileList.slice(0, 5))}
          onRemove={(file) => {
            setFiles((current) =>
              current.filter((item) => item.uid !== file.uid),
            )
            return true
          }}
        >
          <p>
            <UploadCloud size={42} />
          </p>
          <p>
            <strong>Chọn hoặc kéo 1–5 ảnh menu vào đây</strong>
          </p>
          <p>JPG, PNG hoặc WebP; tối đa 10 MB mỗi ảnh</p>
        </Upload.Dragger>
      )}

      {!record && (
        <Button
          type="primary"
          size="large"
          block
          loading={busy}
          disabled={!files.length}
          icon={<ScanLine size={17} />}
          onClick={() => void start()}
          style={{ marginTop: 16 }}
        >
          Bắt đầu nhận dạng
        </Button>
      )}

      {record?.status === "PROCESSING" && (
        <div style={{ textAlign: "center", padding: "46px 16px" }}>
          <Spin size="large" />
          <Typography.Title level={5}>Đang nhận dạng menu</Typography.Title>
          <Typography.Paragraph type="secondary">
            OCR và AI có thể cần đến một phút cho mỗi ảnh. Bạn có thể rời trang
            và quay lại sau.
          </Typography.Paragraph>
          <Progress percent={65} status="active" showInfo={false} />
        </div>
      )}

      {record?.status === "FAILED" && (
        <Alert
          type="error"
          showIcon
          message="Không thể tạo bản nháp"
          description={record.errorReason || "OCR hoặc AI không xử lý được ảnh"}
          action={<Button onClick={reset}>Thử ảnh khác</Button>}
        />
      )}

      {record?.status === "CANCELLED" && (
        <Alert
          type="warning"
          showIcon
          message="Lượt nhập đã bị huỷ"
          action={<Button onClick={reset}>Tạo lượt mới</Button>}
        />
      )}

      {record?.status === "IMPORTED" && (
        <Alert
          type="success"
          showIcon
          message="Menu đã được nhập"
          description={
            record.result
              ? `Tạo mới ${record.result.created}, cập nhật ${record.result.updated}, bỏ qua ${record.result.skipped} món.`
              : undefined
          }
          action={<Button onClick={reset}>Nhập thêm ảnh</Button>}
        />
      )}

      {record?.status === "WAITING_REVIEW" && draft && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 0.8fr) minmax(560px, 1.7fr)",
            gap: 18,
            alignItems: "start",
            overflowX: "auto",
          }}
        >
          <div>
            <Card size="small" title="Ảnh gốc" style={{ marginBottom: 14 }}>
              <Image.PreviewGroup>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {record.imageUrls.map((url) => (
                    <Image
                      key={url}
                      src={`${backendOrigin}${url}`}
                      style={{
                        width: "100%",
                        aspectRatio: "3/4",
                        objectFit: "cover",
                      }}
                      fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            </Card>
            <Collapse
              size="small"
              items={[
                {
                  key: "ocr",
                  label: "Văn bản OCR thô",
                  children: (
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        maxHeight: 300,
                        overflow: "auto",
                      }}
                    >
                      {record.ocrText?.join("\n\n--- Ảnh tiếp theo ---\n\n")}
                    </pre>
                  ),
                },
              ]}
            />
          </div>
          <div>
            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <strong>Bản nháp chờ duyệt</strong>
                <div style={{ color: palette.textMuted, fontSize: 12 }}>
                  Sửa tên, giá, cách xử lý trùng và chi nhánh trước khi nhập
                </div>
              </div>
              <Space>
                <Button loading={busy} onClick={() => void saveDraft()}>
                  Lưu nháp
                </Button>
                <Button type="primary" loading={busy} onClick={commit}>
                  Nhập vào menu
                </Button>
              </Space>
            </Space>
            {draft.unresolved.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`${draft.unresolved.length} dòng chưa hiểu được`}
                description={draft.unresolved.join(" · ")}
                style={{ marginBottom: 12 }}
              />
            )}
            {draft.categories.length === 0 ? (
              <Empty description="AI chưa nhận dạng được món nào" />
            ) : (
              draft.categories.map((category, categoryIndex) => (
                <Card
                  key={`${category.name}-${categoryIndex}`}
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={
                    <Input
                      value={category.name}
                      maxLength={150}
                      onChange={(event) =>
                        setDraft(
                          updateCategory(draft, categoryIndex, {
                            name: event.target.value,
                          }),
                        )
                      }
                    />
                  }
                >
                  <Table<MenuImportDraftItem>
                    rowKey={(_, itemIndex) => String(itemIndex)}
                    pagination={false}
                    size="small"
                    scroll={{ x: 980 }}
                    dataSource={category.items}
                    columns={[
                      {
                        title: "Món",
                        width: 180,
                        render: (_, item, itemIndex) => (
                          <div>
                            <Input
                              value={item.name}
                              status={item.warning ? "warning" : undefined}
                              onChange={(event) =>
                                setDraft(
                                  updateItem(draft, categoryIndex, itemIndex, {
                                    name: event.target.value,
                                  }),
                                )
                              }
                            />
                            {item.warning && (
                              <Typography.Text
                                type="warning"
                                style={{ fontSize: 11 }}
                              >
                                {item.warning}
                              </Typography.Text>
                            )}
                          </div>
                        ),
                      },
                      {
                        title: "Giá",
                        width: 145,
                        render: (_, item, itemIndex) => (
                          <InputNumber
                            min={0}
                            precision={0}
                            value={item.price}
                            addonAfter="₫"
                            onChange={(value) =>
                              setDraft(
                                updateItem(draft, categoryIndex, itemIndex, {
                                  price: value ?? 0,
                                }),
                              )
                            }
                          />
                        ),
                      },
                      {
                        title: "Xử lý",
                        width: 150,
                        render: (_, item, itemIndex) => (
                          <Select
                            value={item.action}
                            style={{ width: "100%" }}
                            onChange={(action) =>
                              setDraft(
                                updateItem(draft, categoryIndex, itemIndex, {
                                  action,
                                }),
                              )
                            }
                            options={[
                              { value: "CREATE", label: "Tạo mới" },
                              { value: "UPDATE_PRICE", label: "Cập nhật giá" },
                              { value: "SKIP", label: "Bỏ qua" },
                            ]}
                          />
                        ),
                      },
                      {
                        title: "Chi nhánh",
                        width: 220,
                        render: (_, item, itemIndex) => (
                          <Select
                            mode="multiple"
                            maxTagCount="responsive"
                            value={item.branchIds}
                            placeholder="Mọi chi nhánh"
                            style={{ width: "100%" }}
                            onChange={(branchIds) =>
                              setDraft(
                                updateItem(draft, categoryIndex, itemIndex, {
                                  branchIds,
                                }),
                              )
                            }
                            options={branches.map((branch) => ({
                              value: branch.id,
                              label: branch.name,
                            }))}
                          />
                        ),
                      },
                      {
                        title: "Size / topping",
                        width: 200,
                        render: (_, item, itemIndex) => (
                          <Space direction="vertical" size={2}>
                            <span>
                              {item.sizes.length
                                ? item.sizes
                                    .map(
                                      (size) =>
                                        `${size.name} +${money(size.priceDelta)}`,
                                    )
                                    .join(", ")
                                : "Không có size"}
                            </span>
                            <span>
                              {item.extras.length
                                ? item.extras
                                    .map(
                                      (extra) =>
                                        `${extra.name} +${money(extra.price)}`,
                                    )
                                    .join(", ")
                                : "Không có topping"}
                            </span>
                            <Button
                              size="small"
                              onClick={() =>
                                setDetailEditor({ categoryIndex, itemIndex })
                              }
                            >
                              Sửa size / topping
                            </Button>
                          </Space>
                        ),
                      },
                      {
                        title: "",
                        width: 48,
                        render: (_, __, itemIndex) => (
                          <Button
                            type="text"
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() =>
                              setDraft(
                                removeItem(draft, categoryIndex, itemIndex),
                              )
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {record &&
        !["PROCESSING", "IMPORTED", "FAILED", "CANCELLED"].includes(
          record.status,
        ) && (
          <div style={{ marginTop: 14 }}>
            <Button
              danger
              icon={<FileImage size={15} />}
              onClick={async () => {
                if (!chainId) return
                await advancedMenuApi.cancelMenuImport(chainId, record.id)
                reset()
              }}
            >
              Huỷ lượt nhập
            </Button>
          </div>
        )}

      <Modal
        title={`Size và topping${detailItem ? ` · ${detailItem.name}` : ""}`}
        open={Boolean(detailItem)}
        onCancel={() => setDetailEditor(null)}
        onOk={() => setDetailEditor(null)}
        okText="Xong"
        cancelButtonProps={{ style: { display: "none" } }}
        width={680}
        destroyOnHidden
      >
        {detailItem && detailEditor && draft && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Space
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Kích cỡ</strong>
                <Button
                  size="small"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    setDraft(
                      updateItem(
                        draft,
                        detailEditor.categoryIndex,
                        detailEditor.itemIndex,
                        {
                          sizes: [
                            ...detailItem.sizes,
                            { name: "", priceDelta: 0 },
                          ],
                        },
                      ),
                    )
                  }
                >
                  Thêm size
                </Button>
              </Space>
              <Space direction="vertical" style={{ width: "100%" }}>
                {detailItem.sizes.map((size, index) => (
                  <div
                    key={`size-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 190px 40px",
                      gap: 8,
                    }}
                  >
                    <Input
                      value={size.name}
                      placeholder="Tên size"
                      onChange={(event) =>
                        setDraft(
                          updateItem(
                            draft,
                            detailEditor.categoryIndex,
                            detailEditor.itemIndex,
                            {
                              sizes: detailItem.sizes.map(
                                (candidate, rowIndex) =>
                                  rowIndex === index
                                    ? { ...candidate, name: event.target.value }
                                    : candidate,
                              ),
                            },
                          ),
                        )
                      }
                    />
                    <InputNumber
                      min={0}
                      precision={0}
                      addonBefore="Cộng"
                      addonAfter="₫"
                      value={size.priceDelta}
                      onChange={(priceDelta) =>
                        setDraft(
                          updateItem(
                            draft,
                            detailEditor.categoryIndex,
                            detailEditor.itemIndex,
                            {
                              sizes: detailItem.sizes.map(
                                (candidate, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...candidate,
                                        priceDelta: priceDelta ?? 0,
                                      }
                                    : candidate,
                              ),
                            },
                          ),
                        )
                      }
                      style={{ width: "100%" }}
                    />
                    <Button
                      danger
                      type="text"
                      icon={<Trash2 size={14} />}
                      onClick={() =>
                        setDraft(
                          updateItem(
                            draft,
                            detailEditor.categoryIndex,
                            detailEditor.itemIndex,
                            {
                              sizes: detailItem.sizes.filter(
                                (_, rowIndex) => rowIndex !== index,
                              ),
                            },
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                {!detailItem.sizes.length && (
                  <Typography.Text type="secondary">
                    Chưa có size
                  </Typography.Text>
                )}
              </Space>
            </div>

            <div>
              <Space
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Topping</strong>
                <Button
                  size="small"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    setDraft(
                      updateItem(
                        draft,
                        detailEditor.categoryIndex,
                        detailEditor.itemIndex,
                        {
                          extras: [
                            ...detailItem.extras,
                            { name: "", price: 0 },
                          ],
                        },
                      ),
                    )
                  }
                >
                  Thêm topping
                </Button>
              </Space>
              <Space direction="vertical" style={{ width: "100%" }}>
                {detailItem.extras.map((extra, index) => (
                  <div
                    key={`extra-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 190px 40px",
                      gap: 8,
                    }}
                  >
                    <Input
                      value={extra.name}
                      placeholder="Tên topping"
                      onChange={(event) =>
                        setDraft(
                          updateItem(
                            draft,
                            detailEditor.categoryIndex,
                            detailEditor.itemIndex,
                            {
                              extras: detailItem.extras.map(
                                (candidate, rowIndex) =>
                                  rowIndex === index
                                    ? { ...candidate, name: event.target.value }
                                    : candidate,
                              ),
                            },
                          ),
                        )
                      }
                    />
                    <InputNumber
                      min={0}
                      precision={0}
                      addonBefore="Giá"
                      addonAfter="₫"
                      value={extra.price}
                      onChange={(price) =>
                        setDraft(
                          updateItem(
                            draft,
                            detailEditor.categoryIndex,
                            detailEditor.itemIndex,
                            {
                              extras: detailItem.extras.map(
                                (candidate, rowIndex) =>
                                  rowIndex === index
                                    ? { ...candidate, price: price ?? 0 }
                                    : candidate,
                              ),
                            },
                          ),
                        )
                      }
                      style={{ width: "100%" }}
                    />
                    <Button
                      danger
                      type="text"
                      icon={<Trash2 size={14} />}
                      onClick={() =>
                        setDraft(
                          updateItem(
                            draft,
                            detailEditor.categoryIndex,
                            detailEditor.itemIndex,
                            {
                              extras: detailItem.extras.filter(
                                (_, rowIndex) => rowIndex !== index,
                              ),
                            },
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                {!detailItem.extras.length && (
                  <Typography.Text type="secondary">
                    Chưa có topping
                  </Typography.Text>
                )}
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </Card>
  )
}

function updateCategory(
  draft: MenuImportDraft,
  categoryIndex: number,
  patch: Partial<MenuImportDraft["categories"][number]>,
): MenuImportDraft {
  return {
    ...draft,
    categories: draft.categories.map((category, index) =>
      index === categoryIndex ? { ...category, ...patch } : category,
    ),
  }
}

function updateItem(
  draft: MenuImportDraft,
  categoryIndex: number,
  itemIndex: number,
  patch: Partial<MenuImportDraftItem>,
): MenuImportDraft {
  const category = draft.categories[categoryIndex]
  return updateCategory(draft, categoryIndex, {
    items: category.items.map((item, index) =>
      index === itemIndex ? { ...item, ...patch } : item,
    ),
  })
}

function removeItem(
  draft: MenuImportDraft,
  categoryIndex: number,
  itemIndex: number,
): MenuImportDraft {
  const category = draft.categories[categoryIndex]
  return updateCategory(draft, categoryIndex, {
    items: category.items.filter((_, index) => index !== itemIndex),
  })
}
