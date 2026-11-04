import { lazy, Suspense } from "react";
import { PageSkeleton } from "./components/Skeleton";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EventsListPage from "./pages/EventsListPage";
import Navbar from "./components/Navbar";
import SessionNotice from "./components/SessionNotice";
import { SavedEventsProvider } from "./context/SavedEventsContext";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const EventDetailsPage = lazy(() => import("./pages/EventDetailsPage"));
const CreateEventPage = lazy(() => import("./pages/CreateEventPage"));
const EditEventPage = lazy(() => import("./pages/EditEventPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SavedEventsPage = lazy(() => import("./pages/SavedEventsPage"));

function App() {
  return (
    <BrowserRouter>
      <SavedEventsProvider>
        <Navbar />
        <SessionNotice />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Suspense fallback={<PageSkeleton />}>
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
          </Suspense>
        </div>
      </SavedEventsProvider>
    </BrowserRouter>
  );
}

export default App;
