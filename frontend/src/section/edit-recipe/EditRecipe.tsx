import { useState } from "react";
import circleArrowLeftIcon from "../../assets/ic-circle-arrow-left.svg";
import saveRecipeIcon from "../../assets/ic-save-cookbook.svg";
import removeIcon from "../../assets/ic-trashcan-remove.svg";
import xmarkWhiteIcon from "../../assets/ic-xmark-white.svg";
import xmarkIcon from "../../assets/ic-xmark.svg";
import type { Recipe } from "../upload/UploadArea";
import "./editRecipe.css";

const EditRecipe = ({
  originalRecipe,
  previousSectionTitle,
  onSubmit = () => {},
  onDelete,
  onCancel,
}: {
  originalRecipe: Recipe;
  previousSectionTitle: string;
  onSubmit?: (editedRecipe: Recipe) => void | Promise<void>;
  onDelete?: (editedRecipe: Recipe) => void | Promise<void>;
  onCancel: () => void;
}) => {
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(originalRecipe);

  return (
    <section className="edit-recipe">
      <p className="back-section" onClick={() => onCancel()}>
        <img src={circleArrowLeftIcon} alt="Back icon" width={18} />
        <span>Back to {previousSectionTitle}</span>
      </p>
      <h1>Edit Recipe</h1>
      <p className="subtext">
        Review and tweak the fields below. Once you click save, the recipe will
        be saved to your digital cookbook.
      </p>

      <form
        key={originalRecipe.id}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(editedRecipe);
        }}
      >
        {/* <div className="watermark">
            #{(id + 1).toString().padStart(2, "0")}
          </div> */}
        <label htmlFor="recipeTitle">
          <p>Recipe Title</p>
          <input
            type="text"
            id="recipeTitle"
            name="recipeTitle"
            value={editedRecipe.title}
            autoFocus={false}
            onChange={(e) => {
              e.preventDefault();
              setEditedRecipe((prev) => ({
                ...prev,
                title: e.target.value,
              }));
            }}
          />
        </label>

        <label>
          <p>Ingredients ({editedRecipe.ingredients.length})</p>
          {editedRecipe.ingredients.map((ing, ingId) => (
            <div className="ingredients-input" key={ingId}>
              <p>○</p>
              <input
                type="text"
                id={`ingredients_${ingId}`}
                name={`ingredients_${ingId}`}
                value={ing}
                autoFocus={false}
                onChange={(e) => {
                  e.preventDefault();
                  setEditedRecipe((prev) => ({
                    ...prev,
                    ingredients: prev.ingredients.toSpliced(
                      ingId,
                      1,
                      e.target.value,
                    ),
                  }));
                }}
              />
              <button
                className="delete-ingredients"
                onClick={(e) => {
                  e.preventDefault();
                  setEditedRecipe((prev) => ({
                    ...prev,
                    ingredients: prev.ingredients.toSpliced(ingId, 1),
                  }));
                }}
              >
                <img
                  src={xmarkIcon}
                  alt="Close icon"
                  className="xmark"
                  width={18}
                />
                <img
                  src={xmarkWhiteIcon}
                  alt="Close icon"
                  className="xmark-white"
                  width={18}
                />
              </button>
            </div>
          ))}
          <button
            onClick={(e) => {
              e.preventDefault();
              setEditedRecipe((prev) => ({
                ...prev,
                ingredients: [...prev.ingredients, ""],
              }));
            }}
          >
            Add
          </button>
        </label>

        <label>
          <p>STEPS ({editedRecipe.steps.length})</p>
          {editedRecipe.steps.map((step, stepId) => (
            <div className="step-input" key={stepId}>
              <p>{stepId + 1}</p>
              <textarea
                id={`step${stepId}`}
                name={`step_${stepId}`}
                value={step}
                autoFocus={false}
                onChange={(e) => {
                  e.preventDefault();
                  setEditedRecipe((prev) => ({
                    ...prev,
                    steps: prev.steps.toSpliced(stepId, 1, e.target.value),
                  }));
                }}
              />
              <button
                className="delete-step"
                onClick={(e) => {
                  e.preventDefault();
                  setEditedRecipe((prev) => ({
                    ...prev,
                    steps: prev.steps.toSpliced(stepId, 1),
                  }));
                }}
              >
                <img
                  src={xmarkIcon}
                  alt="Close icon"
                  className="xmark"
                  width={18}
                />
                <img
                  src={xmarkWhiteIcon}
                  alt="Close icon"
                  className="xmark-white"
                  width={18}
                />
              </button>
            </div>
          ))}
          <button
            onClick={(e) => {
              e.preventDefault();
              setEditedRecipe((prev) => ({
                ...prev,
                steps: [...prev.steps, ""],
              }));
            }}
          >
            Add
          </button>
        </label>

        <div className="submit-buttons">
          <button type="submit">
            <img src={saveRecipeIcon} alt="Save recipe" width={18} />
            Save Recipe
          </button>
          {onDelete && (
            <button
              className="delete-button"
              type="button"
              onClick={() => onDelete(editedRecipe)}
            >
              <img src={removeIcon} alt="Delete recipe" width={18} />
              Delete Recipe
            </button>
          )}
        </div>
      </form>
    </section>
  );
};

export default EditRecipe;
