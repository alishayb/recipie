import { Route, Routes } from "react-router-dom";
import LandingPage from "./LandingPage";
import LegalPage from "./section/auth/LegalPage";
import { ProtectedRoute } from "./section/auth/ProtectedRoute";
import ChatArea from "./section/chat/ChatArea";
import EditRecipePage from "./section/edit-recipe/EditRecipePage";
import MyRecipeList from "./section/my-recipe/MyRecipeList";
import Navigation from "./section/navigation/Navigation";
import ProfilePage from "./section/profile/Profile";
import EditExtractedRecipe from "./section/review-recipe/EditExtractedRecipePage";
import ExtractedRecipesReview from "./section/review-recipe/ExtractedRecipesReview";
import UploadArea from "./section/upload/UploadArea";

function App() {
  return (
    <main>
      <Navigation />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatArea />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadArea />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload/review"
          element={
            <ProtectedRoute>
              <ExtractedRecipesReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload/review/edit"
          element={
            <ProtectedRoute>
              <EditExtractedRecipe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipes"
          element={
            <ProtectedRoute>
              <MyRecipeList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipes/:id"
          element={
            <ProtectedRoute>
              <EditRecipePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/privacy-policy"
          element={<LegalPage initialDoc="privacy" />}
        />
        <Route
          path="/terms-of-service"
          element={<LegalPage initialDoc="terms" />}
        />
      </Routes>
    </main>
  );
}

export default App;
