import { getGammesAdmin } from "./actions";
import { getCategoriesAdmin } from "./actionsCategories";
import GammesEtCategoriesManager from "./GammesEtCategoriesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gammes · Admin" };

export default async function GammesAdminPage() {
  const [gammes, categories] = await Promise.all([
    getGammesAdmin(),
    getCategoriesAdmin(),
  ]);
  return <GammesEtCategoriesManager gammes={gammes} categories={categories} />;
}