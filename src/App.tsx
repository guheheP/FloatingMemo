import Editor from "./components/Editor";
import SettingsPanel from "./components/SettingsPanel";
import TitleBar from "./components/TitleBar";

export default function App() {
  return (
    <div className="app-shell">
      <TitleBar />
      <main className="app-main">
        <Editor />
      </main>
      <SettingsPanel />
    </div>
  );
}
