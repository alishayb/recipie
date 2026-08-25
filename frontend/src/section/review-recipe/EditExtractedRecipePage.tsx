import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditRecipe from "../edit-recipe/EditRecipe";
import type { Recipe } from "../upload/UploadArea";

const EditExtractedRecipe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const source = searchParams.get("source") ?? "";
  const storageKey = searchParams.get("key") ?? "";
  const id = searchParams.get("id") ?? "";

  const [recipeList] = useState<Recipe[] | null>(() => {
    if (!storageKey) return null;
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw).recipeList : null;
  });

  const recipe = recipeList?.find((r) => r.id === id) ?? null;
  const backToReviewUrl = `/upload/review?source=${encodeURIComponent(source)}&key=${encodeURIComponent(storageKey)}`;

  const handleSave = (updatedRecipe: Recipe) => {
    const updatedList = recipeList!.map((r) =>
      r.id === id ? updatedRecipe : r,
    );
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ recipeList: updatedList, source }),
    );
    navigate(backToReviewUrl);
  };

  const handleCancel = useCallback(() => {
    navigate(backToReviewUrl, { replace: true });
  }, [navigate, backToReviewUrl]);

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
