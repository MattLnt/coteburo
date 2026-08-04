import { getGammesAdmin } from "./actions";
import { getCategoriesAdmin } from "./actionsCategories";
import { getFinitionsAdmin } from "./actionsFinitions";
import GammesEtCategoriesManager from "./GammesEtCategoriesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gammes · Admin" };

export default async function GammesAdminPage() {
  const [gammes, categories, finitions] = await Promise.all([
    getGammesAdmin(),
    getCategoriesAdmin(),
    getFinitionsAdmin(),
  ]);
  return (
    <GammesEtCategoriesManager
      gammes={gammes}
      categories={categories}
      finitions={finitions}
    />
  );
}