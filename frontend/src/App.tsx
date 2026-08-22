import { Route, Routes } from "react-router-dom";
import ChatArea from "./section/chat/ChatArea";
import EditRecipePage from "./section/edit-recipe/EditRecipePage";
import MyRecipeList from "./section/my-recipe/MyRecipeList";
import Navigation from "./section/navigation/Navigation";
import EditExtractedRecipe from "./section/review-recipe/EditExtractedRecipePage";
import ExtractedRecipesReview from "./section/review-recipe/ExtractedRecipesReview";
import UploadArea from "./section/upload/UploadArea";

function App() {
  return (
    <main>
      <Navigation />
      <Routes>
        <Route path="/" element={<ChatArea />} />
        <Route path="/chat" element={<ChatArea />} />
        <Route path="/upload" element={<UploadArea />} />
        <Route path="/upload/review" element={<ExtractedRecipesReview />} />
        <Route path="/upload/review/edit" element={<EditExtractedRecipe />} />
        <Route path="/recipes" element={<MyRecipeList />} />
        <Route path="/recipes/:id" element={<EditRecipePage />} />
      </Routes>
    </main>
  );
}

export default App;
