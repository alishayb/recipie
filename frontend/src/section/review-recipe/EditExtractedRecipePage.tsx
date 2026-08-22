import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditRecipe from "../edit-recipe/EditRecipe";
import type { Recipe } from "../upload/UploadArea";

const EditExtractedRecipe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const source = searchParams.get("source") ?? "";
  const id = searchParams.get("id") ?? "";

  const storageKey = `upload-review:${source}`;

  const [recipeList] = useState<Recipe[] | null>(() => {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw).recipeList : null;
  });

  const recipe = recipeList?.find((r) => r.id === id) ?? null;

  const handleSave = (updatedRecipe: Recipe) => {
    const updatedList = recipeList!.map((r) =>
      r.id === id ? updatedRecipe : r,
    );
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ recipeList: updatedList, source }),
    );
    navigate(`/upload/review?source=${encodeURIComponent(source)}`);
  };

  const handleCancel = useCallback(() => {
    navigate(`/upload/review?source=${encodeURIComponent(source)}`, {
      replace: true,
    });
  }, [navigate, source]);

  useEffect(() => {
    if (!recipe) handleCancel();
  }, [recipe, handleCancel]);

  if (!recipe) return null;

  return (
    <EditRecipe
      originalRecipe={recipe}
      onSubmit={handleSave}
      previousSectionTitle="Extracted Recipe List"
      onCancel={handleCancel}
    />
  );
};

export default EditExtractedRecipe;
