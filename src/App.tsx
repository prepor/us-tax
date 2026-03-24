import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import StatePage from "./pages/StatePage";
import CalculatorPage from "./pages/CalculatorPage";
import ComparePage from "./pages/ComparePage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/state/:abbr" element={<StatePage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Route>
    </Routes>
  );
}

export default App;
