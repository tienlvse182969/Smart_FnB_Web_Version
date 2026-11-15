import { Button, Tabs } from "antd";
import { ScanLine } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/bits";
import MenuTable from "./MenuTable";
import CategoriesTable from "./CategoriesTable";

const IMPORT_PATH = "/brand-manager/menu/import";

/**
 * "Món & danh mục": gộp Menu toàn chuỗi và Danh mục món thành một trang hai tab. Tab nằm trong URL
 * (?tab=categories) nên F5, nút Back và link trực tiếp đều đúng; route cũ /menu/categories chuyển về đây.
 */
export default function MenuHub() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "categories" ? "categories" : "items";

  return (
    <>
      <PageHeader
        title="Món & danh mục"
        sub="Món và danh mục của cả chuỗi. Chi nhánh chỉ bán món chuỗi đang bật."
        extra={
          <Button icon={<ScanLine size={15} />} onClick={() => navigate(IMPORT_PATH)}>
            Nhập từ ảnh (AI)
          </Button>
        }
      />
      <Tabs
        activeKey={tab}
        onChange={(key) => setParams(key === "categories" ? { tab: "categories" } : {}, { replace: true })}
        items={[
          { key: "items", label: "Món", children: <MenuTable embedded /> },
          { key: "categories", label: "Danh mục", children: <CategoriesTable embedded /> },
        ]}
      />
    </>
  );
}
