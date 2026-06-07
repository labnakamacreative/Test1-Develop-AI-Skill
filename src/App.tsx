import { useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { ContentModal } from "./components/ContentModal";
import { Sidebar, type ViewKey } from "./components/Sidebar";
import { Dashboard } from "./views/Dashboard";
import { Board } from "./views/Board";
import { CalendarView } from "./views/Calendar";
import { Bank } from "./views/Bank";
import { Pipeline } from "./views/Pipeline";
import { MyQueue } from "./views/MyQueue";
import { Analytics } from "./views/Analytics";
import { ApprovalInbox } from "./views/ApprovalInbox";
import { Settings } from "./views/Settings";
import { Brands } from "./views/Brands";
import type { ModalControl } from "./viewTypes";

function Shell() {
  const { config } = useStore();
  const [view, setView] = useState<ViewKey>("dashboard");
  const [modalItem, setModalItem] = useState<string | null | undefined>(undefined); // undefined = closed

  const openModal = (id: string | null) => setModalItem(id);
  const closeModal = () => setModalItem(undefined);

  const ctrl: ModalControl = { open: openModal };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar view={view} setView={setView} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">
          {view === "dashboard" && <Dashboard ctrl={ctrl} setView={setView} />}
          {view === "brands" && <Brands setView={setView} />}
          {view === "board" && <Board ctrl={ctrl} />}
          {view === "calendar" && <CalendarView ctrl={ctrl} />}
          {view === "bank" && <Bank ctrl={ctrl} />}
          {view === "pipeline" && <Pipeline ctrl={ctrl} />}
          {view === "queue" && config.roleBasedViewsEnabled && <MyQueue ctrl={ctrl} />}
          {view === "analytics" && <Analytics ctrl={ctrl} />}
          {view === "approval" && config.approvalEnabled && <ApprovalInbox ctrl={ctrl} />}
          {view === "settings" && <Settings />}
        </div>
      </main>

      {modalItem !== undefined && <ContentModal itemId={modalItem} onClose={closeModal} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
