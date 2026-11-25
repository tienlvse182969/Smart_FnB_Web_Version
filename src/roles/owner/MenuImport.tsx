import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Image,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  type UploadFile,
} from "antd"
import { Save, SavePen, ScanLine, Trash2, UploadCloud, X } from "lucide-react"
import SparkleGlow from "../../components/SparkleGlow"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  extrasApi,
  optionsApi,
  advancedMenuApi,
  showApiError,
  type MenuImport as MenuImportRecord,
  type MenuImportDraft,
  type MenuImportDraftItem,
} from "../../api"
import { useSearchParams } from "react-router-dom"
import { API_BASE_URL } from "../../config"
import MoneyInput from "../../components/MoneyInput"
import { money } from "../../data"
import { useAppStore } from "../../store"
import { palette } from "../../theme"
import { PageHeader } from "../../components/bits"

const backendOrigin = API_BASE_URL.replace(/\/api(?:\/v\d+)?\/?$/, "")
const importKey = (chainId: string, excel: boolean) => `smartfnb_menu_import_${chainId}${excel ? "_excel" : ""}`

export default function MenuImport() {
  const [params] = useSearchParams()
  const excel = params.get("source") === "excel"
  return <MenuImportForm key={excel ? "excel" : "image"} excel={excel} />
}

export function MenuImportForm({ excel, onImported }: { excel: boolean; onImported?: () => void }) {
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

  const [library, setLibrary] = useState<{ groups: Awaited<ReturnType<typeof optionsApi.listGroups>>; extras: Awaited<ReturnType<typeof extrasApi.listExtras>> } | null>(null)
  const [libraryError, setLibraryError] = useState(false)
  useEffect(() => {
    let current = true
    setLibrary(null)
    setLibraryError(false)
    if (detailEditor && chainId) {
      Promise.all([optionsApi.listGroups(chainId), extrasApi.listExtras(chainId)])
        .then(([groups, extras]) => {
          if (current) setLibrary({ groups: groups.filter(g => g.isActive), extras: extras.filter(e => e.isActive) })
        })
        .catch(() => { if (current) setLibraryError(true) })
    }
    return () => { current = false }
  }, [detailEditor, chainId])

  const detailItem =
    detailEditor && draft
      ? draft.categories[detailEditor.categoryIndex]?.items[
          detailEditor.itemIndex
        ]
      : undefined

  const patchDetails = (patch: Partial<MenuImportDraftItem>) => {
    if (detailEditor && draft) setDraft(updateItem(draft, detailEditor.categoryIndex, detailEditor.itemIndex, patch))
  }
  const chooseGroup = (id: string) => {
    const group = library?.groups.find(g => g.id === id)
    if (!group || !detailItem || detailItem.optionGroups.some(g => g.groupId === id)) return
    const link = { groupId: id, name: group.name, options: group.options.filter(o => o.isActive).map(o => ({ name: o.name, priceDelta: o.priceDelta })), isRequired: group.isRequired, minSelections: group.minSelections, maxSelections: group.maxSelections }
    patchDetails({ optionGroups: [...detailItem.optionGroups.filter(entry => entry.groupId || !sameName(entry.name, group.name)), link] })
  }
  const chooseExtra = (id: string) => {
    const extra = library?.extras.find(e => e.id === id)
    if (!extra || !detailItem || detailItem.extras.some(e => e.extraId === id)) return
    const link = { extraId: id, name: extra.name, price: extra.price, maxQuantity: 1 }
    patchDetails({ extras: [...detailItem.extras.filter(entry => entry.extraId || !sameName(entry.name, extra.name)), link] })
  }

  const refresh = useCallback(
    async (id: string) => {
      if (!chainId) return
      try {
        const next = await advancedMenuApi.getMenuImport(chainId, id)
        setRecord(next)
        if (next.draft) setDraft(normalizeDraft(next.draft))
        if (["IMPORTED", "FAILED", "CANCELLED"].includes(next.status)) {
          localStorage.removeItem(importKey(chainId, excel))
        }
      } catch (error) {
        showApiError(message.error, error, "Không tải được lượt nhập menu")
      }
    },
    [chainId, message, excel],
  )

  useEffect(() => {
    if (!chainId) return
    const id = localStorage.getItem(importKey(chainId, excel))
    if (id) void refresh(id)
  }, [chainId, refresh, excel])

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
    if (!selected.length) return message.warning("Vui lòng chọn tệp menu")
    try {
      setBusy(true)
      const next = excel
        ? await advancedMenuApi.createExcelImport(chainId, await (await import("./readMenuExcel")).default(selected[0]))
        : await advancedMenuApi.createMenuImport(chainId, selected)
      localStorage.setItem(importKey(chainId, excel), next.id)
      setRecord(next)
      setDraft(next.draft ? normalizeDraft(next.draft) : null)
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
          await advancedMenuApi.updateMenuImportDraft(chainId, record.id, {
            ...draft,
            categories: draft.categories.map(category => ({
              ...category,
              items: category.items.map(item => ({
                ...item,
                optionGroups: item.optionGroups.filter(group => group.groupId),
                extras: item.extras.filter(extra => extra.extraId),
              })),
            })),
          })
          const next = await advancedMenuApi.commitMenuImport(
            chainId,
            record.id,
          )
          setRecord(next)
          localStorage.removeItem(importKey(chainId, excel))
          message.success("Đã nhập menu thành công")
          onImported?.()
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
    if (chainId) localStorage.removeItem(importKey(chainId, excel))
  }

  return (
    <Card variant={onImported ? "borderless" : "outlined"} style={{ borderRadius: 14, boxShadow: onImported ? "none" : undefined }} styles={{ body: { padding: onImported ? 0 : 20 } }}>
      {excel ? <div style={{ marginBottom: 18 }}>
        {!onImported && <Typography.Title level={4} style={{ margin: 0 }}>
          Nhập menu từ Excel
        </Typography.Title>}
        <Typography.Text type="secondary">
          Trang tính đầu tiên cần có các cột Danh mục, Tên món và Giá. Có thể thêm cột Mô tả.
           <a href="/menu-mau.xlsx" download>Tải file mẫu</a>
        </Typography.Text>
      </div> : (<PageHeader
        title="Nhập từ ảnh (AI)"
        sub="OCR đọc chữ, AI tạo bản nháp; chỉ ghi menu sau khi Brand Manager kiểm tra và xác nhận."
      />)}

      {!record && (
        <Upload.Dragger
          multiple={!excel}
          accept={excel ? ".xlsx" : "image/jpeg,image/png,image/webp"}
          fileList={files}
          listType={excel ? "text" : "picture-card"}
          showUploadList={excel ? true : { showPreviewIcon: false }}
          maxCount={excel ? 1 : 5}
          beforeUpload={() => false}
          onChange={({ fileList }) => setFiles(excel ? fileList.slice(-1) : fileList.slice(0, 5))}
          onRemove={(file) => {
            setFiles((current) =>
              current.filter((item) => item.uid !== file.uid),
            )
            return true
          }}
        >
          <p style={{ display: "flex", justifyContent: "center", margin: "0 0 12px" }}>
            <UploadCloud size={42} />
          </p>
          <p>
            <strong>{excel ? "Chọn hoặc kéo file Excel vào đây" : "Chọn hoặc kéo 1–5 ảnh menu vào đây"}</strong>
          </p>
          <p>{excel ? "XLSX · tối đa 2 MB và 500 món" : "JPG, PNG hoặc WebP; tối đa 10 MB mỗi ảnh"}</p>
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
          {excel ? "Xem bản nháp" : "Bắt đầu nhận dạng"}
        </Button>
      )}

      {record?.status === "PROCESSING" && (
        <div style={{ textAlign: "center", padding: "46px 16px" }}>
          <SparkleGlow />
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
          action={<Button onClick={reset}>{excel ? "Nhập file khác" : "Nhập thêm ảnh"}</Button>}
        />
      )}

      {record?.status === "WAITING_REVIEW" && draft && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {!excel && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(200px, 300px) minmax(0, 1fr)",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              <Card
                size="small"
                title="Ảnh gốc"
                style={{ height: "100%" }}
                styles={{ body: { height: 190, overflowY: "auto" } }}
              >
                <Image.PreviewGroup>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
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
              <Card
                size="small"
                title="Văn bản OCR thô"
                style={{ height: "100%" }}
                styles={{ body: { height: 190, overflowY: "auto" } }}
              >
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {record.ocrText?.join("\n\n--- Ảnh tiếp theo ---\n\n")}
                </pre>
              </Card>
            </div>
          )}
          <div style={{ minWidth: 0 }}>
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
                <Button
                  danger
                  icon={<X size={15} />}
                  onClick={async () => {
                    if (!chainId) return
                    await advancedMenuApi.cancelMenuImport(chainId, record.id)
                    reset()
                  }}
                >
                  Huỷ lượt nhập
                </Button>
                <Button
                  icon={<SavePen size={15} />}
                  loading={busy}
                  onClick={() => void saveDraft()}
                >
                  Lưu nháp
                </Button>
                <Button
                  type="primary"
                  icon={<Save size={15} />}
                  loading={busy}
                  onClick={commit}
                >
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
                              {item.optionGroups.some(entry => entry.groupId)
                                ? item.optionGroups.filter(entry => entry.groupId)
                                    .map((group) => `${group.name}: ${group.options.map((option) => `${option.name} +${money(option.priceDelta)}`).join(", ")}`)
                                    .join(" · ")
                                : "Chưa có tuỳ chọn món"}
                            </span>
                            <span>
                              {item.extras.some(entry => entry.extraId)
                                ? item.extras.filter(entry => entry.extraId)
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
        {detailItem && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {libraryError && <Alert type="error" showIcon title="Không tải được thư viện. Đóng và mở lại để thử lại." />}
            <section>
              <strong>Tùy chọn món</strong>
              <Select mode="multiple" aria-label="Chọn nhóm tùy chọn" placeholder="Chọn nhóm từ thư viện"
                style={{ width: "100%" }} loading={!library && !libraryError} disabled={!library}
                optionFilterProp="label" notFoundContent="Không tìm thấy nhóm tùy chọn"
                value={detailItem.optionGroups.flatMap(g => g.groupId ? [g.groupId] : [])}
                options={library?.groups.map(g => ({ value: g.id, label: g.name }))}
                onSelect={chooseGroup} onDeselect={id => patchDetails({ optionGroups: detailItem.optionGroups.filter(g => g.groupId !== id) })} />
              {detailItem.optionGroups.filter(g => g.groupId).map(g =>
                <div key={g.groupId}>{g.name} · {g.options.map(o => o.priceDelta ? `${o.name} +${money(o.priceDelta)}` : o.name).join(" · ")}</div>
              )}
            </section>
            <section>
              <strong>Topping thêm</strong>
              <Select mode="multiple" aria-label="Chọn topping" placeholder="Chọn topping từ thư viện"
                style={{ width: "100%" }} loading={!library && !libraryError} disabled={!library}
                optionFilterProp="label" notFoundContent="Không tìm thấy topping"
                value={detailItem.extras.flatMap(e => e.extraId ? [e.extraId] : [])}
                options={library?.extras.map(e => ({ value: e.id, label: `${e.name} · ${money(e.price)}` }))}
                onSelect={chooseExtra} onDeselect={id => patchDetails({ extras: detailItem.extras.filter(e => e.extraId !== id) })} />
              {detailItem.extras.filter(e => e.extraId).map(extra =>
                <details key={extra.extraId}>
                  <summary>{extra.name} · {money(extra.price)} · tối đa {extra.maxQuantity ?? 3} phần</summary>
                  <Space wrap>
                    <label>Giá cộng thêm <MoneyInput value={extra.price}
                      onChange={price => patchDetails({ extras: detailItem.extras.map(e => e === extra ? { ...e, price: price ?? 0 } : e) })} /></label>
                    <label>Số phần tối đa <InputNumber min={1} max={5} precision={0} value={extra.maxQuantity ?? 3}
                      onChange={v => patchDetails({ extras: detailItem.extras.map(e => e === extra ? { ...e, maxQuantity: v ?? 1 } : e) })} /></label>
                  </Space>
                </details>
              )}
            </section>
            {library && [...detailItem.optionGroups.filter(g => !g.groupId).map(g => ({ name: g.name, found: library.groups.some(v => sameName(v.name, g.name)) })),
              ...detailItem.extras.filter(e => !e.extraId).map(e => ({ name: e.name, found: library.extras.some(v => sameName(v.name, e.name)) }))].map((entry, index) =>
                <Typography.Text key={index} type="secondary">{entry.name} · {entry.found ? "OCR nhận diện, chưa chọn" : "Chưa có trong thư viện"}</Typography.Text>
              )}
          </Space>
        )}
      </Modal>
    </Card>
  )
}

function sameName(left: string, right: string) {
  return left.trim().localeCompare(right.trim(), "vi", { sensitivity: "accent" }) === 0
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
