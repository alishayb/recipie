import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import documentIcon from "../../assets/ic-upload-doc.svg";
import uploadFileIcon from "../../assets/ic-upload-file.svg";
import { API_BASE_URL } from "../../constants/constants";
import LoadingExtraction from "../chat/LoadingExtraction";
import "./uploadArea.css";
import Toast from "../../components/toast/Toast";

export type Recipe = {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
};

const UploadArea = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const endpoint =
        file.type === "application/pdf" ? "upload-pdf" : "upload-image";

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (data: { recipes: Recipe[] }, file) => {
      const recipeList: Recipe[] = data.recipes.map((r) => ({
        ...r,
        id: crypto.randomUUID(),
      }));

      const storageKey = `upload-review:${file.name}`;
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ recipeList, source: file.name }),
      );

      navigate(`/upload/review?source=${encodeURIComponent(file.name)}`);

      // navigate("/upload/review", {
      //   state: { recipeList, source: file.name },
      // });
    },
  });

  const handleSelectedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.type.includes("image")) {
      uploadFile.mutate(file);
    }

    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      setDropError("Please drop only one file at a time.");
      return;
    }

    setDropError(null);
    const file = files[0];
    if (file.type === "application/pdf" || file.type.includes("image")) {
      uploadFile.mutate(file);
    }
  };

  return (
    <section className="upload-area">
      {isDragging && <div className="drag-overlay" />}
      {dropError && <p className="drop-error">{dropError}</p>}
      <h1>Import New Recipes</h1>
      <p className="subtext">
        Transform any cooking source into a cleanly formatted digital recipe.
        Simply choose your recipe file below.
      </p>
      {uploadFile.isPending ? (
        <div className="upload-source">
          <LoadingExtraction />
        </div>
      ) : (
        <div className="upload-source">
          <div
            className={`drag-n-drop ${isDragging ? "drag-n-drop--active" : ""}`}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <img src={documentIcon} alt="Drop document icon" width={54} />
            <h2>{isDragging ? "Drop it here!" : "Add a Recipe"}</h2>
            <p className="subtext">
              {isDragging
                ? "Release to upload your recipe"
                : "Drop a photo, screenshot, or cookbook PDF pages here"}
            </p>
          </div>
          <label htmlFor="recipeFiles">
            <input
              type="file"
              id="recipeFiles"
              name="recipeFiles"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleSelectedFile}
              disabled={uploadFile.isPending}
            />
            <img src={uploadFileIcon} alt="Upload icon" width={16} />
            <span>Choose File</span>
          </label>
        </div>
      )}

      {uploadFile.isError && (
        <Toast
          type="error"
          title={uploadFile.error.name}
          message={uploadFile.error.message}
        />
      )}
    </section>
  );
};

export default UploadArea;
