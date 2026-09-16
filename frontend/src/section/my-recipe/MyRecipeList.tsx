import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import rightIcon from "../../assets/ic-chevron-right.svg";
import Toast from "../../components/toast/Toast";
import { apiFetch } from "../../utils/api";
import EditRecipe from "../edit-recipe/EditRecipe";
import type { Recipe } from "../upload/UploadArea";
import "./recipe-list-page.css";

const MyRecipeList = () => {
  const navigate = useNavigate();
  const {
    data: recipes,
    isError,
    error,
  } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const res = await apiFetch("/recipes");
      return res.json() as Promise<Recipe[]>;
    },
    retry: false,
  });

  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!editRecipe) return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      setEditRecipe(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [editRecipe]);

  if (editRecipe) {
    return (
      <EditRecipe
        originalRecipe={editRecipe}
        onSubmit={() => {
          setEditRecipe(null);
        }}
        previousSectionTitle="My Recipe List"
        onCancel={() => setEditRecipe(null)}
      />
    );
  }

  return (
    <section className="recipe-list-page">
      <h1>My Cookbook</h1>
      <p className="subtext">
        A collection of your favorite dishes, parsed and written down.
      </p>
      <div className="recipe-list">
        {recipes &&
          recipes.map((recipe) => (
            <div
              className="recipe"
              key={recipe.id}
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <div className="content">
                <p className="title">{recipe.title}</p>
                <div className="detail">
                  <p>{recipe.ingredients.length} ingredients</p>
                  <p>●</p>
                  <p>{recipe.steps.length} steps</p>
                </div>
              </div>

              <img src={rightIcon} alt="Edit recipe" />
            </div>
          ))}
      </div>

      {isError && (
        <Toast type="error" title={error.name} message={error.message} />
      )}
    </section>
  );
};

export default MyRecipeList;
