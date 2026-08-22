import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../constants/constants";
import type { Recipe } from "../upload/UploadArea";
import EditRecipe from "./EditRecipe";

const EditRecipePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/recipe/${id}`);

      if (!res.ok) {
        throw new Error("Failed to fetch recipe");
      }

      const parsedData = await res.json();
      console.log(">> parsedData", parsedData);
      return parsedData;
    },
    enabled: !!id,
  });

  const [loadSubmit, setLoadSubmit] = useState(false);
  const handleSave = async (recipe: Recipe) => {
    setLoadSubmit(true);

    const text = [
      "Ingredients:",
      ...recipe.ingredients,
      "",
      "Steps:",
      ...recipe.steps,
    ].join("\n");

    const res = await fetch(`${API_BASE_URL}/recipes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: recipe.title,
        text,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update recipe");
    }

    navigate("/recipes");
    setLoadSubmit(false);
  };

  const handleDelete = async () => {
    setLoadSubmit(true);

    const res = await fetch(`${API_BASE_URL}/recipes/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error("Failed to update recipe");
    }

    navigate("/recipes");
    setLoadSubmit(false);
  };

  if (isLoading || loadSubmit) {
    return (
      <div className="edit-recipe">
        <div className="edit-recipe-loader"></div>
      </div>
    );
  } else
    return (
      <EditRecipe
        originalRecipe={data}
        onSubmit={handleSave}
        onDelete={handleDelete}
        previousSectionTitle="My Recipe"
        onCancel={() => {
          navigate("/recipes");
        }}
      />
    );
};

export default EditRecipePage;
