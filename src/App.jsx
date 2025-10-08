import { useState } from "react";
import AdminScreen from "./components/AdminScreen";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { supabase } from './supabaseClient';
import "./App.css";

function App() {
  const [calibrado, setCalirado] = useState(false);
  const [pontoReferencia, setPontoReferencia] = useState(null);
  const [pontos, setPontos] = useLocalStorage("pontos", []);
  const [qntdPontos, setQntdPontos] = useState(0);

  async function getQtndPontos(qrReferencia) {
    const { count, error } = await supabase
      .from("pontos")
      .select("*", { count: 'exact', head: true })
      .eq("qr_referencia", qrReferencia);

    if (error) {
      console.log("Erro ao encontrar pontos: ", error.message);
      return;
    }

    return count;
  }

  const updatePontos = (novoPonto) => {
    if (Array.isArray(novoPonto)) {
      setPontos(novoPonto);
    } else {
      setPontos((prev) => [...prev, novoPonto]);
    }
  };

  return (
    <div className="app">
      <div className="admin-header-bar">
        <img src="/logoprojeto.png" alt="LocalizAR Admin" className="admin-logo" />
        <h1>Painel Administrativo</h1>
      </div>
      
      <AdminScreen
        calibrado={calibrado}
        setCalirado={setCalirado}
        pontoReferencia={pontoReferencia}
        setPontoReferencia={setPontoReferencia}
        qntdPontos={qntdPontos}
        setQntdPontos={setQntdPontos}
        getQtndPontos={getQtndPontos}
        pontos={pontos}
        updatePontos={updatePontos}
      />
    </div>
  );
}

export default App;
