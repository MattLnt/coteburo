import { ArticlesManager } from "./ArticlesManager";
import { getArticles } from "./actions";

export const dynamic = "force-dynamic";

export default async function ArticlesAdminPage() {
  const articles = await getArticles();

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "#23262a", margin: "0 0 4px" }}>Articles</h1>
        <p style={{ fontSize: 14.5, color: "#5c616a", margin: 0 }}>Rédigez et publiez vos conseils et actualités sur le blog.</p>
      </div>

      <ArticlesManager articles={JSON.parse(JSON.stringify(articles))} />
    </>
  );
}