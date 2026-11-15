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
  Switch,
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
import type { MenuImportDraftOptionGroup } from "../../api/modules/advancedMenu"
import { API_BASE_URL } from "../../config"
import MoneyInput from "../../components/MoneyInput"
import { money } from "../../data"
import { useAppStore } from "../../store"
import { palette } from "../../theme"
import { AccentBadge, PageHeader } from "../../components/bits"

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
        if (next.draft) setDraft(normalizeDraft(next.draft))
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
    if (invalidOptionGroups(draft)) return message.error("Kiểm tra tên nhóm, lựa chọn và số lượng được chọn")
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
    if (invalidOptionGroups(draft)) return message.error("Kiểm tra tên nhóm, lựa chọn và số lượng được chọn")
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
      <PageHeader
        title="Nhập từ ảnh (AI)"
        extra={<AccentBadge>AI</AccentBadge>}
        sub="OCR đọc chữ, AI tạo bản nháp; chỉ ghi menu sau khi Brand Manager kiểm tra và xác nhận."
      />

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
                          <MoneyInput
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
                            placeholder={item.action === "CREATE" ? "Mọi chi nhánh" : "Giữ chi nhánh hiện tại"}
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
                        title: "Tuỳ chọn món / Topping thêm",
                        width: 200,
                        render: (_, item, itemIndex) => (
                          <Space direction="vertical" size={2}>
                            <span>
                              {item.optionGroups.length
                                ? item.optionGroups
                                    .map((group) => `${group.name}: ${group.options.map((option) => `${option.name} +${money(option.priceDelta)}`).join(", ")}`)
                                    .join(" · ")
                                : "Chưa có tuỳ chọn món"}
                            </span>
                            <span>
                              {item.extras.length
                                ? item.extras
                                    .map(
                                      (extra) =>
                                        `${extra.name} +${money(extra.price)}`,
                                    )
                                    .join(", ")
                                : "Chưa có topping thêm"}
                            </span>
                            <Button
                              size="small"
                              onClick={() =>
                                setDetailEditor({ categoryIndex, itemIndex })
                              }
                            >
                              Sửa tuỳ chọn món / topping thêm
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
        title={`Tuỳ chọn món và topping thêm${detailItem ? ` · ${detailItem.name}` : ""}`}
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
            <DraftOptionGroupsEditor
              groups={detailItem.optionGroups}
              onChange={(optionGroups) =>
                setDraft(updateItem(draft, detailEditor.categoryIndex, detailEditor.itemIndex, { optionGroups }))
              }
            />

            <div>
              <Space
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Topping thêm</strong>
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
                  Thêm topping thêm
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
                    <MoneyInput
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
                    Chưa có topping thêm
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

function normalizeDraft(draft: MenuImportDraft): MenuImportDraft {
  return {
    ...draft,
    categories: draft.categories.map((category) => ({
      ...category,
      items: category.items.map(({ sizes, ...item }) => ({
        ...item,
        optionGroups: Array.isArray(item.optionGroups)
          ? item.optionGroups
          : sizes?.length
            ? [{ name: "Kích cỡ", isRequired: true, minSelections: 1, maxSelections: 1, options: sizes }]
            : [],
      })),
    })),
  }
}

function invalidOptionGroups(draft: MenuImportDraft): boolean {
  return draft.categories.some((category) => category.items.some((item) => item.optionGroups.some((group) =>
    !group.name.trim() || !group.options.length || group.options.some((option) => !option.name.trim() || !Number.isInteger(option.priceDelta) || option.priceDelta < 0) ||
    !Number.isInteger(group.minSelections) || !Number.isInteger(group.maxSelections) ||
    group.isRequired !== (group.minSelections > 0) || group.maxSelections < Math.max(1, group.minSelections) || group.maxSelections > group.options.length ||
    new Set(group.options.map((option) => option.name.trim().toLocaleLowerCase("vi"))).size !== group.options.length,
  )))
}

function DraftOptionGroupsEditor({ groups, onChange }: { groups: MenuImportDraftOptionGroup[]; onChange: (groups: MenuImportDraftOptionGroup[]) => void }) {
  const changeGroup = (index: number, patch: Partial<MenuImportDraftOptionGroup>) =>
    onChange(groups.map((group, i) => i === index ? { ...group, ...patch } : group))

  return (
    <div>
      <Space style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>Tuỳ chọn món</strong>
        <Button size="small" icon={<Plus size={14} />} onClick={() => onChange([...groups, {
          name: "", isRequired: false, minSelections: 0, maxSelections: 1, options: [],
        }])}>Thêm nhóm tuỳ chọn</Button>
      </Space>
      <Typography.Text type="secondary">Tạo nhóm như “Kích cỡ”, “Mức đường” hoặc “Đá”; mỗi nhóm có các lựa chọn và giá cộng thêm.</Typography.Text>
      {!groups.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có nhóm tuỳ chọn món" />}
      {groups.map((group, groupIndex) => (
        <Card key={groupIndex} size="small" style={{ marginTop: 12 }}
          title={<Input aria-label={`Tên nhóm tuỳ chọn ${groupIndex + 1}`} value={group.name} maxLength={100} placeholder="Tên nhóm, VD: Mức đường" onChange={(event) => changeGroup(groupIndex, { name: event.target.value })} />}
          extra={<Button type="text" danger aria-label={`Xoá nhóm tuỳ chọn ${groupIndex + 1}`} icon={<Trash2 size={14} />} onClick={() => onChange(groups.filter((_, i) => i !== groupIndex))} />}
        >
          <Space wrap style={{ marginBottom: 12 }}>
            <span>Bắt buộc chọn</span>
            <Switch checked={group.isRequired} onChange={(checked) => changeGroup(groupIndex, { isRequired: checked, minSelections: checked ? Math.max(1, group.minSelections) : 0 })} />
            <span>Tối thiểu</span>
            <InputNumber aria-label="Số lựa chọn tối thiểu" min={0} max={Math.max(group.options.length, 1)} precision={0} value={group.minSelections} onChange={(value) => changeGroup(groupIndex, { minSelections: value ?? 0, isRequired: (value ?? 0) > 0 })} style={{ width: 70 }} />
            <span>Tối đa</span>
            <InputNumber aria-label="Số lựa chọn tối đa" min={1} max={Math.max(group.options.length, 1)} precision={0} value={group.maxSelections} onChange={(value) => changeGroup(groupIndex, { maxSelections: value ?? 1 })} style={{ width: 70 }} />
          </Space>
          <Space direction="vertical" style={{ width: "100%" }}>
            {group.options.map((option, optionIndex) => (
              <div key={optionIndex} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 170px 36px", gap: 8 }}>
                <Input aria-label={`Lựa chọn ${optionIndex + 1}`} value={option.name} maxLength={100} placeholder="Tên lựa chọn" onChange={(event) => changeGroup(groupIndex, { options: group.options.map((value, i) => i === optionIndex ? { ...value, name: event.target.value } : value) })} />
                <MoneyInput aria-label={`Giá cộng thêm lựa chọn ${optionIndex + 1}`} addonAfter="₫" value={option.priceDelta} onChange={(value) => changeGroup(groupIndex, { options: group.options.map((entry, i) => i === optionIndex ? { ...entry, priceDelta: value ?? 0 } : entry) })} style={{ width: "100%" }} />
                <Button danger type="text" aria-label={`Xoá lựa chọn ${optionIndex + 1}`} icon={<Trash2 size={14} />} onClick={() => changeGroup(groupIndex, { options: group.options.filter((_, i) => i !== optionIndex) })} />
              </div>
            ))}
            <Button size="small" icon={<Plus size={14} />} onClick={() => changeGroup(groupIndex, { options: [...group.options, { name: "", priceDelta: 0 }] })}>Thêm lựa chọn</Button>
          </Space>
        </Card>
      ))}
    </div>
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
