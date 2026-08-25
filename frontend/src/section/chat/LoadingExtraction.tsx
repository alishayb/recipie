import type { FileStatus } from "../upload/UploadArea";
import "./loadExtraction.css";

const LoadingExtraction = ({ files }: { files: FileStatus[] }) => {
  return (
    <div className="load-wrapper">
      <p>
        Extracting recipe (
        {files.filter((file) => file.status === "done").length}/{files.length}{" "}
        completed)
      </p>
      <div className="load-extraction"></div>
    </div>
  );
};

export default LoadingExtraction;
