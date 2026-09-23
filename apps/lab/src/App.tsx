import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { Dashboard } from "./routes/Dashboard";
import { Challenges } from "./routes/Challenges";
import { ChallengeDetail } from "./routes/ChallengeDetail";
import { Learning } from "./routes/Learning";
import { LearningDetail } from "./routes/LearningDetail";
import { CTF } from "./routes/CTF";
import { MissionDetail } from "./routes/MissionDetail";
import { Tools } from "./routes/Tools";
import { ToolDetail } from "./routes/ToolDetail";
import { About } from "./routes/About";
import { NotFound } from "./routes/NotFound";

/** App shell + routing for the CYVANTAS Security Lab. */
function App() {
  return (
    <RootLayout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/challenges/:slug" element={<ChallengeDetail />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/learning/:slug" element={<LearningDetail />} />
        <Route path="/ctf" element={<CTF />} />
        <Route path="/ctf/:slug" element={<MissionDetail />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/:slug" element={<ToolDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </RootLayout>
  );
}

export default App;
