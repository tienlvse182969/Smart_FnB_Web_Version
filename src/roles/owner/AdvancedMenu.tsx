import {
  App,
  Button,
  Card,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  advancedMenuApi,
  menuApi,
  showApiError,
  type BranchPriceCell,
  type ChainCombo,
  type ComboComponent,
  type MenuExtra,
  type SaveComboInput,
} from "../../api"
import { SectionTitle } from "../../components/bits"
import { money } from "../../data"
import { useAppStore } from "../../store"
import type { MenuCategory, MenuItem } from "../../types"

const toNumber = (value: string | number | null | undefined) =>
  Number(value ?? 0)

export default function AdvancedMenu() {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Sản phẩm nâng cao"
        sub="Quản lý combo, món thêm/topping và giá riêng theo từng chi nhánh"
      />
      <Tabs
        items={[
          { key: "combos", label: "Combo", children: <CombosTab /> },
          {
            key: "extras",
            label: "Món thêm & topping",
            children: <ExtrasTab />,
          },
          {
            key: "prices",
            label: "Giá theo chi nhánh",
            children: <BranchPricesTab />,
          },
        ]}
      />
    </Card>
  )
}

function useMenuReference() {
  const chainId = useAppStore((state) => state.chainId)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  useEffect(() => {
    if (!chainId) return
    void Promise.all([
      menuApi.listCategories(chainId),
      menuApi.listItems(chainId),
    ]).then(([nextCategories, nextItems]) => {
      setCategories(nextCategories)
      setItems(nextItems)
    })
  }, [chainId])
  return { chainId, categories, items }
}

function CombosTab() {
  const { message, modal } = App.useApp()
  const { chainId, categories, items } = useMenuReference()
  const branches = useAppStore((state) => state.branches)
  const [combos, setCombos] = useState<ChainCombo[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<ChainCombo | "new" | null>(null)

  const load = useCallback(async () => {
    if (!chainId) return
    setLoading(true)
    try {
      setCombos(await advancedMenuApi.listCombos(chainId))
    } catch (error) {
      showApiError(message.error, error, "Không tải được combo")
    } finally {
      setLoading(false)
    }
  }, [chainId, message])

  useEffect(() => void load(), [load])

  const remove = (combo: ChainCombo) => {
    modal.confirm({
      title: `Ngừng bán combo “${combo.name}”?`,
      content:
        "Combo sẽ được xoá khỏi menu bán; dữ liệu đơn cũ vẫn được giữ nguyên.",
      okText: "Ngừng bán",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return
        await advancedMenuApi.deleteCombo(chainId, combo.id)
        message.success("Đã ngừng bán combo")
        await load()
      },
    })
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <Button
          type="primary"
          icon={<Plus size={15} />}
          onClick={() => setEditing("new")}
        >
          Tạo combo
        </Button>
      </div>
      <Table<ChainCombo>
        rowKey="id"
        loading={loading}
        dataSource={combos}
        pagination={false}
        locale={{ emptyText: "Chưa có combo" }}
        scroll={{ x: 820 }}
        columns={[
          {
            title: "Combo",
            dataIndex: "name",
            render: (name, row) => (
              <Space>
                <strong>{name}</strong>
                {!row.isActive && <Tag>Đã tắt</Tag>}
              </Space>
            ),
          },
          {
            title: "Giá",
            dataIndex: "price",
            align: "right",
            render: (value) => money(toNumber(value)),
          },
          {
            title: "Thành phần",
            render: (_, row) => `${row.components.length} nhóm`,
          },
          {
            title: "Chi nhánh",
            render: (_, row) =>
              `${row.branches.filter((branch) => branch.isEnabled).length}/${branches.length}`,
          },
          {
            title: "",
            align: "right",
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  icon={<Pencil size={14} />}
                  onClick={() => setEditing(row)}
                >
                  Sửa
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<Trash2 size={14} />}
                  onClick={() => remove(row)}
                >
                  Xoá
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <ComboDrawer
        combo={editing}
        categories={categories}
        items={items}
        branches={branches}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          message.success("Đã lưu combo")
          await load()
        }}
      />
    </>
  )
}

type ComboForm = SaveComboInput & { branchIds: string[] }

function blankComponent(index: number): ComboComponent {
  return {
    type: "FIXED",
    name: `Thành phần ${index + 1}`,
    quantity: 1,
    displayOrder: index,
    choices: [],
  }
}

function ComboChoicesField({
  value = [],
  onChange,
  items,
}: {
  value?: ComboComponent["choices"]
  onChange?: (value: ComboComponent["choices"]) => void
  items: MenuItem[]
}) {
  const selectedIds = value.map((choice) => choice.menuItemId)
  const update = (next: ComboComponent["choices"]) => onChange?.(next)

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Select
        mode="multiple"
        optionFilterProp="label"
        value={selectedIds}
        onChange={(ids: string[]) => {
          const existing = new Map(
            value.map((choice) => [choice.menuItemId, choice]),
          )
          const next = ids.map(
            (id): ComboComponent["choices"][number] =>
              existing.get(id) ?? {
                menuItemId: id,
                surcharge: 0,
                isDefault: false,
              },
          )
          if (next.length && !next.some((choice) => choice.isDefault))
            next[0] = { ...next[0], isDefault: true }
          update(next)
        }}
        options={items.map((item) => ({
          value: item.id,
          label: `${item.name} · ${money(item.price)}`,
        }))}
      />
      {value.length > 0 && (
        <Radio.Group
          value={value.find((choice) => choice.isDefault)?.menuItemId}
          onChange={(event) =>
            update(
              value.map((choice) => ({
                ...choice,
                isDefault: choice.menuItemId === event.target.value,
              })),
            )
          }
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            {value.map((choice) => {
              const item = items.find(
                (candidate) => candidate.id === choice.menuItemId,
              )
              return (
                <div
                  key={choice.menuItemId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(160px, 1fr) 170px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Radio value={choice.menuItemId}>
                    {item?.name ?? choice.menuItemId} · mặc định
                  </Radio>
                  <InputNumber
                    min={0}
                    precision={0}
                    addonBefore="Phụ thu"
                    addonAfter="₫"
                    value={toNumber(choice.surcharge)}
                    onChange={(surcharge) =>
                      update(
                        value.map((candidate) =>
                          candidate.menuItemId === choice.menuItemId
                            ? { ...candidate, surcharge: surcharge ?? 0 }
                            : candidate,
                        ),
                      )
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              )
            })}
          </Space>
        </Radio.Group>
      )}
    </Space>
  )
}

function ComboDrawer({
  combo,
  categories,
  items,
  branches,
  onClose,
  onSaved,
}: {
  combo: ChainCombo | "new" | null
  categories: MenuCategory[]
  items: MenuItem[]
  branches: Array<{ id: string; name: string }>
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { message } = App.useApp()
  const chainId = useAppStore((state) => state.chainId)
  const [form] = Form.useForm<ComboForm>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!combo) return
    form.setFieldsValue(
      combo === "new"
        ? {
            name: "",
            categoryId: categories[0]?.id,
            price: 0,
            isActive: true,
            branchIds: branches.map((branch) => branch.id),
            components: [blankComponent(0), blankComponent(1)],
          }
        : {
            categoryId: combo.categoryId,
            name: combo.name,
            description: combo.description,
            imageUrl: combo.imageUrl,
            price: toNumber(combo.price),
            isActive: combo.isActive,
            branchIds: combo.branches
              .filter((branch) => branch.isEnabled)
              .map((branch) => branch.branchId),
            components: combo.components.map((component) => ({
              ...component,
              choices: component.choices.map((choice) => ({
                ...choice,
                surcharge: toNumber(choice.surcharge),
              })),
            })),
          },
    )
  }, [branches, categories, combo, form])

  const save = async () => {
    if (!chainId || !combo) return
    try {
      const values = await form.validateFields()
      for (const component of values.components) {
        if (component.type === "FIXED" && component.choices.length !== 1)
          throw new Error("Thành phần cố định phải có đúng một món")
        if (component.type === "CHOICE" && component.choices.length < 2)
          throw new Error("Nhóm lựa chọn phải có ít nhất hai món")
        if (component.choices.filter((choice) => choice.isDefault).length !== 1)
          throw new Error("Mỗi thành phần phải có đúng một món mặc định")
      }
      setSaving(true)
      const payload: SaveComboInput = {
        ...values,
        components: values.components.map((component, index) => ({
          ...component,
          displayOrder: index,
          choices: component.choices,
        })),
      }
      const saved =
        combo === "new"
          ? await advancedMenuApi.createCombo(chainId, payload)
          : await advancedMenuApi.updateCombo(chainId, combo.id, payload)
      await advancedMenuApi.assignComboBranches(
        chainId,
        saved.id,
        values.branchIds,
      )
      await onSaved()
    } catch (error) {
      if (
        error instanceof Error &&
        !Array.isArray((error as { errorFields?: unknown }).errorFields)
      )
        message.error(error.message)
      else if (!(error as { errorFields?: unknown }).errorFields)
        showApiError(message.error, error, "Không lưu được combo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={combo === "new" ? "Tạo combo" : "Sửa combo"}
      open={Boolean(combo)}
      onClose={onClose}
      width={680}
      extra={
        <Button type="primary" loading={saving} onClick={() => void save()}>
          Lưu combo
        </Button>
      }
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Form.Item
            name="name"
            label="Tên combo"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="Danh mục"
            rules={[{ required: true }]}
          >
            <Select
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="price"
            label="Giá combo"
            rules={[{ required: true }]}
          >
            <InputNumber
              min={0}
              precision={0}
              addonAfter="₫"
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item name="imageUrl" label="URL ảnh">
            <Input placeholder="https://..." />
          </Form.Item>
        </div>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Form.Item
          name="isActive"
          label="Đang kinh doanh"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item name="branchIds" label="Chi nhánh bán combo">
          <Checkbox.Group
            options={branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
          />
        </Form.Item>
        <Typography.Title level={5}>Thành phần (2–6 nhóm)</Typography.Title>
        <Form.List
          name="components"
          rules={[
            {
              validator: async (_, value) => {
                if (!value || value.length < 2 || value.length > 6)
                  throw new Error("Combo cần từ 2 đến 6 thành phần")
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Card
                  key={field.key}
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={`Thành phần ${index + 1}`}
                  extra={
                    fields.length > 2 && (
                      <Button
                        danger
                        type="text"
                        onClick={() => remove(field.name)}
                      >
                        Xoá
                      </Button>
                    )
                  }
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 130px 100px",
                      gap: 10,
                    }}
                  >
                    <Form.Item
                      name={[field.name, "name"]}
                      label="Tên nhóm"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item name={[field.name, "type"]} label="Kiểu">
                      <Select
                        options={[
                          { value: "FIXED", label: "Cố định" },
                          { value: "CHOICE", label: "Lựa chọn" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, "quantity"]} label="Số lượng">
                      <InputNumber min={1} max={5} style={{ width: "100%" }} />
                    </Form.Item>
                  </div>
                  <Form.Item
                    name={[field.name, "choices"]}
                    label="Món trong thành phần"
                    rules={[{ required: true }]}
                  >
                    <ComboChoicesField items={items} />
                  </Form.Item>
                </Card>
              ))}
              <Form.ErrorList errors={errors} />
              <Button
                block
                disabled={fields.length >= 6}
                onClick={() => add(blankComponent(fields.length))}
                icon={<Plus size={14} />}
              >
                Thêm thành phần
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  )
}

function ExtrasTab() {
  const { message } = App.useApp()
  const { chainId, items } = useMenuReference()
  const [extras, setExtras] = useState<MenuExtra[]>([])
  const [editing, setEditing] = useState<MenuExtra | "new" | null>(null)
  const [assigningItemId, setAssigningItemId] = useState<string>()
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!chainId) return
    setLoading(true)
    try {
      setExtras(await advancedMenuApi.listExtras(chainId))
    } catch (error) {
      showApiError(message.error, error, "Không tải được món thêm")
    } finally {
      setLoading(false)
    }
  }, [chainId, message])
  useEffect(() => void load(), [load])

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn món để gắn topping"
          style={{ minWidth: 300 }}
          value={assigningItemId}
          onChange={setAssigningItemId}
          options={items.map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.sku}`,
          }))}
        />
        <Button
          type="primary"
          icon={<Plus size={15} />}
          onClick={() => setEditing("new")}
        >
          Thêm món thêm
        </Button>
      </div>
      {assigningItemId && (
        <ItemExtrasEditor
          item={items.find((item) => item.id === assigningItemId)}
          extras={extras}
          onSaved={() => message.success("Đã cập nhật topping cho món")}
        />
      )}
      <Table<MenuExtra>
        rowKey="id"
        loading={loading}
        dataSource={extras}
        pagination={false}
        locale={{ emptyText: "Chưa có món thêm/topping" }}
        columns={[
          { title: "Tên", dataIndex: "name" },
          {
            title: "Giá mặc định",
            dataIndex: "price",
            align: "right",
            render: (value) => money(toNumber(value)),
          },
          {
            title: "Trạng thái",
            dataIndex: "isActive",
            render: (active) => (
              <Tag color={active ? "green" : "default"}>
                {active ? "Đang bán" : "Đã tắt"}
              </Tag>
            ),
          },
          {
            title: "",
            align: "right",
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => setEditing(row)}>
                  Sửa
                </Button>
                {row.isActive && (
                  <Popconfirm
                    title="Ngừng bán món thêm này?"
                    onConfirm={async () => {
                      if (!chainId) return
                      await advancedMenuApi.disableExtra(chainId, row.id)
                      await load()
                    }}
                  >
                    <Button size="small" danger>
                      Ngừng bán
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      <ExtraModal
        extra={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          message.success("Đã lưu món thêm")
          await load()
        }}
      />
    </>
  )
}

function ExtraModal({
  extra,
  onClose,
  onSaved,
}: {
  extra: MenuExtra | "new" | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { message } = App.useApp()
  const chainId = useAppStore((state) => state.chainId)
  const [form] = Form.useForm<{
    name: string
    price: number
    isActive: boolean
  }>()
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (extra)
      form.setFieldsValue(
        extra === "new"
          ? { name: "", price: 0, isActive: true }
          : {
              name: extra.name,
              price: toNumber(extra.price),
              isActive: extra.isActive,
            },
      )
  }, [extra, form])
  const save = async () => {
    if (!chainId || !extra) return
    try {
      setSaving(true)
      await advancedMenuApi.saveExtra(
        chainId,
        await form.validateFields(),
        extra === "new" ? undefined : extra.id,
      )
      await onSaved()
    } catch (error) {
      if (!(error as { errorFields?: unknown }).errorFields)
        showApiError(message.error, error, "Không lưu được món thêm")
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title={extra === "new" ? "Thêm món thêm/topping" : "Sửa món thêm/topping"}
      open={Boolean(extra)}
      onCancel={onClose}
      onOk={() => void save()}
      confirmLoading={saving}
      okText="Lưu"
      cancelText="Huỷ"
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Tên"
          rules={[{ required: true, whitespace: true }]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item
          name="price"
          label="Giá mặc định"
          rules={[{ required: true }]}
        >
          <InputNumber
            min={0}
            precision={0}
            addonAfter="₫"
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          name="isActive"
          label="Đang kinh doanh"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ItemExtrasEditor({
  item,
  extras,
  onSaved,
}: {
  item?: MenuItem
  extras: MenuExtra[]
  onSaved: () => void
}) {
  const { message } = App.useApp()
  const chainId = useAppStore((state) => state.chainId)
  const [selected, setSelected] = useState<Array<{
    extraId: string
    price: number
    maxQuantity: number
  }>>([])
  const [maxExtras, setMaxExtras] = useState(5)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!chainId || !item) return
    void advancedMenuApi.getItemExtras(chainId, item.id).then((settings) => {
      setSelected(
        settings.extras.map((link) => ({
          extraId: link.extraId,
          price: toNumber(link.price),
          maxQuantity: link.maxQuantity,
        })),
      )
      setMaxExtras(settings.maxExtras)
    })
  }, [chainId, item])
  if (!item) return null
  return (
    <Card
      size="small"
      title={`Topping cho ${item.name}`}
      style={{ marginBottom: 16 }}
      extra={
        <Button
          type="primary"
          size="small"
          loading={saving}
          onClick={async () => {
            if (!chainId) return
            try {
              setSaving(true)
              await advancedMenuApi.setItemExtras(chainId, item.id, {
                maxExtras,
                extras: selected.map((row, index) => ({
                  ...row,
                  displayOrder: index,
                })),
              })
              onSaved()
            } catch (error) {
              showApiError(message.error, error, "Không gắn được topping")
            } finally {
              setSaving(false)
            }
          }}
        >
          Lưu gắn món
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space>
          <span>Tối đa trên mỗi ly</span>
          <InputNumber
            min={0}
            max={100}
            value={maxExtras}
            onChange={(value) => setMaxExtras(value ?? 0)}
          />
        </Space>
        <Checkbox.Group
          value={selected.map((row) => row.extraId)}
          onChange={(values) => {
            const ids = values as string[]
            const current = new Map(selected.map((row) => [row.extraId, row]))
            setSelected(
              ids.map((extraId) => {
                const extra = extras.find(
                  (candidate) => candidate.id === extraId,
                )
                return (
                  current.get(extraId) ?? {
                    extraId,
                    price: toNumber(extra?.price),
                    maxQuantity: 1,
                  }
                )
              }),
            )
          }}
          options={extras
            .filter((extra) => extra.isActive)
            .map((extra) => ({
              value: extra.id,
              label: `${extra.name} (+${money(toNumber(extra.price))})`,
            }))}
        />
        {selected.map((row) => {
          const extra = extras.find((candidate) => candidate.id === row.extraId)
          return (
            <div
              key={row.extraId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(160px, 1fr) 180px 170px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <strong>{extra?.name ?? row.extraId}</strong>
              <InputNumber
                min={0}
                precision={0}
                addonBefore="Giá"
                addonAfter="₫"
                value={row.price}
                onChange={(price) =>
                  setSelected((current) =>
                    current.map((candidate) =>
                      candidate.extraId === row.extraId
                        ? { ...candidate, price: price ?? 0 }
                        : candidate,
                    ),
                  )
                }
                style={{ width: "100%" }}
              />
              <InputNumber
                min={1}
                max={100}
                addonBefore="Tối đa"
                value={row.maxQuantity}
                onChange={(maxQuantity) =>
                  setSelected((current) =>
                    current.map((candidate) =>
                      candidate.extraId === row.extraId
                        ? { ...candidate, maxQuantity: maxQuantity ?? 1 }
                        : candidate,
                    ),
                  )
                }
                style={{ width: "100%" }}
              />
            </div>
          )
        })}
      </Space>
    </Card>
  )
}

function BranchPricesTab() {
  const { message } = App.useApp()
  const chainId = useAppStore((state) => state.chainId)
  const [cells, setCells] = useState<BranchPriceCell[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>(
    [],
  )
  const [branchId, setBranchId] = useState<string>()
  const [draft, setDraft] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!chainId) return
    setLoading(true)
    try {
      const matrix = await advancedMenuApi.getBranchPrices(chainId)
      setCells(matrix.cells)
      setBranches(matrix.branches)
      setBranchId((current) => current ?? matrix.branches[0]?.id)
      setDraft({})
    } catch (error) {
      showApiError(message.error, error, "Không tải được bảng giá")
    } finally {
      setLoading(false)
    }
  }, [chainId, message])
  useEffect(() => void load(), [load])
  const visible = useMemo(
    () => cells.filter((cell) => cell.branchId === branchId),
    [branchId, cells],
  )
  const keyOf = (cell: BranchPriceCell) =>
    `${cell.type}:${cell.productId}:${cell.branchId}`
  const changed = visible.filter((cell) =>
    Object.prototype.hasOwnProperty.call(draft, keyOf(cell)),
  )

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <Select
          value={branchId}
          onChange={(value) => {
            setBranchId(value)
            setDraft({})
          }}
          style={{ minWidth: 260 }}
          options={branches.map((branch) => ({
            value: branch.id,
            label: branch.name,
          }))}
          placeholder="Chọn chi nhánh"
        />
        <Button
          type="primary"
          disabled={!changed.length}
          onClick={async () => {
            if (!chainId) return
            try {
              await advancedMenuApi.saveBranchPrices(
                chainId,
                changed.map((cell) => ({
                  type: cell.type,
                  productId: cell.productId,
                  branchId: cell.branchId,
                  priceOverride: draft[keyOf(cell)],
                })),
              )
              message.success("Đã lưu giá chi nhánh")
              await load()
            } catch (error) {
              showApiError(message.error, error, "Không lưu được bảng giá")
            }
          }}
        >
          Lưu {changed.length ? `${changed.length} thay đổi` : "thay đổi"}
        </Button>
      </div>
      {!branchId ? (
        <Empty description="Chưa có chi nhánh" />
      ) : (
        <Table<BranchPriceCell>
          rowKey={keyOf}
          loading={loading}
          dataSource={visible}
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            { title: "Sản phẩm", dataIndex: "name" },
            {
              title: "Loại",
              dataIndex: "type",
              render: (type) => <Tag>{type === "ITEM" ? "Món" : "Combo"}</Tag>,
            },
            {
              title: "Giá toàn chuỗi",
              dataIndex: "chainPrice",
              align: "right",
              render: (value) => money(toNumber(value)),
            },
            {
              title: "Giá tại chi nhánh",
              align: "right",
              render: (_, cell) => {
                const key = keyOf(cell)
                const value = Object.prototype.hasOwnProperty.call(draft, key)
                  ? draft[key]
                  : cell.priceOverride === null
                    ? null
                    : toNumber(cell.priceOverride)
                return (
                  <InputNumber
                    min={0}
                    precision={0}
                    value={value}
                    placeholder={money(toNumber(cell.chainPrice))}
                    addonAfter="₫"
                    onChange={(next) =>
                      setDraft((current) => ({ ...current, [key]: next }))
                    }
                  />
                )
              },
            },
            {
              title: "Giá áp dụng",
              align: "right",
              render: (_, cell) => {
                const key = keyOf(cell)
                const overridden = Object.prototype.hasOwnProperty.call(
                  draft,
                  key,
                )
                  ? draft[key]
                  : cell.priceOverride
                return money(
                  overridden === null
                    ? toNumber(cell.chainPrice)
                    : toNumber(overridden),
                )
              },
            },
          ]}
        />
      )}
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        Xoá giá nhập để dùng lại giá toàn chuỗi. Giá bất thường vẫn được BE ghi
        nhận kèm cảnh báo nghiệp vụ.
      </Typography.Paragraph>
    </>
  )
}
