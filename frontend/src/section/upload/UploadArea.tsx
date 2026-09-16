import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import documentIcon from "../../assets/ic-upload-doc.svg";
import uploadFileIcon from "../../assets/ic-upload-file.svg";
import Toast from "../../components/toast/Toast";
import { apiFetch } from "../../utils/api";
import { isValidFileType } from "../../utils/file";
import LoadingExtraction from "../chat/LoadingExtraction";
import "./uploadArea.css";

export type Recipe = {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
};

export type FileStatus = {
  name: string;
  status: "pending" | "done" | "error";
};

const uploadOneFile = async (file: File): Promise<Recipe[]> => {
  const endpoint =
    file.type === "application/pdf" ? "upload-pdf" : "upload-image";

  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch(`/${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  const data: { recipes: Recipe[] } = await res.json();
  return data.recipes;
};

const UploadArea = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const updateStatus = (name: string, status: FileStatus["status"]) => {
    setFileStatuses((prev) =>
      prev.map((f) => (f.name === name ? { ...f, status } : f)),
    );
  };

  const uploadFiles = async (files: File[]) => {
    setUploadErrors([]);
    setIsUploading(true);
    setFileStatuses(files.map((f) => ({ name: f.name, status: "pending" })));

    const results = await Promise.allSettled(
      files.map(async (file) => {
        try {
          const recipes = await uploadOneFile(file);
          updateStatus(file.name, "done");
          return recipes;
        } catch (err) {
          updateStatus(file.name, "error");
          throw err;
        }
      }),
    );

    const recipeList: Recipe[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        result.value.forEach((r) =>
          recipeList.push({ ...r, id: crypto.randomUUID() }),
        );
      } else {
        errors.push(files[i].name);
      }
    });

    setIsUploading(false);

    if (recipeList.length === 0) {
      setUploadErrors(errors);
      return;
    }

    const source = files.map((f) => f.name).join(",");
    const storageKey = `upload-review:batch-${Date.now()}`;
    sessionStorage.setItem(storageKey, JSON.stringify({ recipeList, source }));

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    navigate(
      `/upload/review?source=${encodeURIComponent(source)}&key=${encodeURIComponent(storageKey)}`,
    );
  };

  const handleSelectedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(isValidFileType);
    if (files.length > 0) {
      uploadFiles(files);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files ?? []).filter(
      isValidFileType,
    );
    if (files.length === 0) {
      setDropError("Please drop a photo, screenshot, or PDF.");
      return;
    }

    setDropError(null);
    uploadFiles(files);
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
      {isUploading ? (
        <div className="upload-source">
          <LoadingExtraction files={fileStatuses} />
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
                : "Drop photos, screenshots, or cookbook PDF pages here"}
            </p>
          </div>
          <label htmlFor="recipeFiles">
            <input
              type="file"
              id="recipeFiles"
              name="recipeFiles"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              multiple
              onChange={handleSelectedFile}
              disabled={isUploading}
            />
            <img src={uploadFileIcon} alt="Upload icon" width={16} />
            <span>Choose File</span>
          </label>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <Toast
          type="error"
          title="Some files failed"
          message={`Failed to extract: ${uploadErrors.join(", ")}`}
        />
      )}
    </section>
  );
};

export default UploadArea;
