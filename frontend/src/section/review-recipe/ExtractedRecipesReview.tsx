import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import rightIcon from "../../assets/ic-chevron-right.svg";
import saveRecipeIcon from "../../assets/ic-save-cookbook.svg";
import removeHoverIcon from "../../assets/ic-trashcan-remove-active.svg";
import removeIcon from "../../assets/ic-trashcan-remove.svg";
import { API_BASE_URL } from "../../constants/constants";
import EditRecipe from "../edit-recipe/EditRecipe";
import "../my-recipe/recipe-list-page.css";
import type { Recipe } from "../upload/UploadArea";
import "./extractedRecipe.css";

const ExtractedRecipesReview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source") ?? "";

  const [reviewData] = useState<{ recipeList: Recipe[] } | null>(() => {
    if (!source) return null;
    const raw = sessionStorage.getItem(`upload-review:${source}`);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (!reviewData) navigate("/upload", { replace: true });
  }, [reviewData, navigate]);

  const [editedRecipeList, setEditedRecipeList] = useState<Recipe[]>(
    reviewData?.recipeList ?? [],
  );
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const saveRecipe = useMutation({
    mutationFn: async (recipe: Recipe) => {
      const text = [
        "Ingredients:",
        ...recipe.ingredients,
        "",
        "Steps:",
        ...recipe.steps,
      ].join("\n");

      const res = await fetch(`${API_BASE_URL}/save-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipe.title,
          text,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }),
      });

      if (!res.ok) throw new Error("Failed to save recipe");
      return res.json();
    },
  });

  const handleSaveAllRecipes = async () => {
    setIsLoading(true);
    try {
      await Promise.all(
        editedRecipeList.map((recipe) => saveRecipe.mutateAsync(recipe)),
      );
      sessionStorage.removeItem(`upload-review:${source}`);
      navigate("/recipes");
    } catch (err) {
      console.error("Failed to save one or more recipes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (editRecipe && !isLoading) {
    return (
      <EditRecipe
        originalRecipe={editRecipe}
        onSubmit={(newRecipe) => {
          setEditedRecipeList((prev) =>
            prev.map((rec) => (rec.id === newRecipe.id ? newRecipe : rec)),
          );
          setEditRecipe(null);
        }}
        previousSectionTitle="Extracted Recipe List"
        onCancel={() => setEditRecipe(null)}
      />
    );
  }

  return (
    <section className="recipe-list-page">
      <div className="badges">
        <div className="source-badge">Source: {source}</div>
        <time dateTime={now.toISOString()}>Parsed today at {timeString}</time>
      </div>
      <h1>
        Extracted{" "}
        <span className="num-recipes">{editedRecipeList.length} Recipes</span>
      </h1>
      <p className="subtext">
        Review and tweak the fields below. Once you click save, the recipe will
        be saved to your digital cookbook.
      </p>
      <div className="recipe-list">
        {editedRecipeList.map((recipe) => (
          <div className="recipe-wrapper" key={recipe.id}>
            <div
              className="remove-recipe"
              onClick={() =>
                setEditedRecipeList((prev) =>
                  prev.filter((prevRecipe) => prevRecipe.id !== recipe.id),
                )
              }
            >
              <img
                src={removeIcon}
                className="remove"
                alt="Remove recipe"
                width={24}
              />
              <img
                src={removeHoverIcon}
                className="remove-active"
                alt="Remove recipe"
                width={24}
              />
            </div>
            <div
              className="recipe"
              onClick={() =>
                navigate(
                  `/upload/review/edit?source=${encodeURIComponent(source)}&id=${recipe.id}`,
                )
              }
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
          </div>
        ))}
      </div>

      <div className="submit-button">
        <button onClick={handleSaveAllRecipes} disabled={isLoading}>
          <img src={saveRecipeIcon} alt="Save all recipe" width={18} />
          <p>Save All Recipe</p>
        </button>
        {isLoading && <div className="load-saveall-recipe"></div>}
      </div>
    </section>
  );
};

export default ExtractedRecipesReview;
