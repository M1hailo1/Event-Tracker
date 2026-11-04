import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import EventsListPage from "./pages/EventsListPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import CreateEventPage from "./pages/CreateEventPage";
import EditEventPage from "./pages/EditEventPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import Navbar from "./components/Navbar";
import UserProfilePage from "./pages/UserProfilePage";
import AdminPage from "./pages/AdminPage";
import SavedEventsPage from "./pages/SavedEventsPage";
import { SavedEventsProvider } from "./context/SavedEventsContext";

function App() {
  return (
    <BrowserRouter>
      <SavedEventsProvider>
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<EventsListPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/saved" element={<SavedEventsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id/edit" element={<EditEventPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
      </SavedEventsProvider>
    </BrowserRouter>
  );
}

export default App;
