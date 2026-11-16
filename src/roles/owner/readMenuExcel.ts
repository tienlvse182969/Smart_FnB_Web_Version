import { readSheet } from "read-excel-file/browser"

const aliases = {
  category: ["danh muc", "nhom mon", "category"],
  name: ["ten mon", "mon", "name", "item name"],
  price: ["gia", "gia ban", "don gia", "gia vnd", "gia ban vnd", "price"],
  description: ["mo ta", "description"],
}

function header(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/đ/g, "d").replace(/[()]/g, "").trim().replace(/\s+/g, " ")
}

export default async function readMenuExcel(file: File) {
  if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024)
    throw new Error("Vui lòng chọn file .xlsx tối đa 2 MB")
  const sheet = await readSheet(await file.arrayBuffer()).catch(() => {
    throw new Error("Không đọc được file Excel. Hãy mở file và lưu lại dưới dạng .xlsx.")
  })
  const headerIndex = sheet.findIndex(row => {
    const cells = row.map(header)
    return [aliases.category, aliases.name, aliases.price].every(names => names.some(n => cells.includes(n)))
  })
  if (headerIndex < 0) throw new Error("Thiếu cột Danh mục, Tên món hoặc Giá ở trang tính đầu tiên")
  const headers = sheet[headerIndex].map(header)
  const column = (names: string[]) => headers.findIndex(value => names.includes(value))
  const columns = { category: column(aliases.category), name: column(aliases.name), price: column(aliases.price), description: column(aliases.description) }
  const rows = []
  for (let i = headerIndex + 1; i < sheet.length; i++) {
    const row = sheet[i]
    if (row.every(cell => cell == null || cell === "")) continue
    const category = row[columns.category]
    const name = row[columns.name]
    const raw = row[columns.price]
    const numeric = typeof raw === "string" ? raw.trim().replace(/\s*(?:₫|đ|vnd)$/i, "") : raw
    const price = typeof numeric === "number" ? numeric :
      typeof numeric === "string" && /^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+)$/.test(numeric)
        ? Number(numeric.replace(/[.,]/g, "")) : NaN
    if (typeof category !== "string" || !category.trim() || typeof name !== "string" || !name.trim())
      throw new Error(`Dòng ${i + 1} thiếu danh mục hoặc tên món`)
    if (!Number.isSafeInteger(price) || price < 0 || price > 2147483647)
      throw new Error(`Giá ở dòng ${i + 1} phải là số nguyên VND từ 0 đến 2.147.483.647`)
    rows.push({ category: category.trim(), name: name.trim(), price, description: String(row[columns.description] ?? "").trim() })
    if (rows.length > 500) throw new Error("Mỗi lần nhập tối đa 500 món")
  }
  if (!rows.length) throw new Error("File Excel chưa có món nào")
  return rows
}
