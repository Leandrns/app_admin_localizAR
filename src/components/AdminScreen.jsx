// src/components/AdminScreen.jsx
import { useState, useEffect } from "react";
import QRScanner from "./QRScanner";
import ARView from "./ARView";
import "../styles/admin.css";
import { supabase } from '../supabaseClient'

function AdminScreen({
	calibrado,
	setCalirado,
	pontoReferencia,
	setPontoReferencia,
	qntdPontos,
	setQntdPontos,
	getQtndPontos,
	pontos,
	updatePontos,
}) {
	const [showQRScanner, setShowQRScanner] = useState(false);
	const [pontosCreated, setPontosCreated] = useState(0);
	const [showAR, setShowAR] = useState(false);
	
	// Fila de nomes
	const [nomesInput, setNomesInput] = useState("");
	const [filaNomes, setFilaNomes] = useState([]);
	const [nomesConsumidos, setNomesConsumidos] = useState(0);

	useEffect(() => {
		if (calibrado && pontoReferencia) {
			const pontosDoEvento = pontos.filter(
				(p) => p.qrReferencia === pontoReferencia.qrCode
			);
			setPontosCreated(pontosDoEvento.length);
			setQntdPontos(getQtndPontos(pontoReferencia.qrCode))
		}
	}, [pontos, pontoReferencia, calibrado]);

	const handleQRDetected = (qrData) => {
		if (qrData.length > 3) {
			const novoPontoReferencia = {
				qrCode: qrData,
				timestamp: Date.now(),
				gps: null,
				arPosition: null,
			};

			setPontoReferencia(novoPontoReferencia);
			setCalirado(true);
			setShowQRScanner(false);

			alert(
				`Calibração realizada!\nEvento: ${qrData}\n\nAgora digite os nomes dos pontos que deseja criar (um por linha)`
			);
		} else {
			alert("QR Code inválido. Use um QR Code válido.");
		}
	};

	const handlePrepararNomes = () => {
		// Processa os nomes: divide por linha, remove vazios e espaços extras
		const nomes = nomesInput
			.split('\n')
			.map(nome => nome.trim())
			.filter(nome => nome.length > 0);

		if (nomes.length === 0) {
			alert("Digite pelo menos um nome de ponto!");
			return;
		}

		setFilaNomes(nomes);
		setNomesConsumidos(0);
		setShowAR(true);
	};

	const handleCreatePoint = async (dadosPonto) => {
		const novoPonto = {
			id: generateId(),
			posicaoRelativa: dadosPonto,
			qrReferencia: pontoReferencia.qrCode,
			timestamp: Date.now(),
			criadoPor: "admin",
			nome: dadosPonto.nome || "Sem nome",
		};

		updatePontos(novoPonto);
		setPontosCreated((prev) => prev + 1);

		// Salva no Supabase
		const { error } = await supabase.from("pontos").insert({
			id: novoPonto.id,
			pos_x: dadosPonto.x,
			pos_y: dadosPonto.y,
			pos_z: dadosPonto.z,
			qr_referencia: novoPonto.qrReferencia,
			created_by: novoPonto.criadoPor,
			nome: dadosPonto.nome || "Sem nome",
		});

		if (error) {
			console.error("Erro ao salvar ponto no Supabase:", error.message);
			alert("Erro ao salvar ponto!");
		} else {
			console.log("✅ Ponto salvo no Supabase:", dadosPonto.nome);
		}
	};

	const consumirProximoNome = () => {
		if (nomesConsumidos < filaNomes.length) {
			const nome = filaNomes[nomesConsumidos];
			setNomesConsumidos(prev => prev + 1);
			return nome;
		}
		return null; // Retorna null se não houver mais nomes
	};

	const handleVoltarParaEdicao = () => {
		setShowAR(false);
		// Mantém os nomes não consumidos
		const nomesRestantes = filaNomes.slice(nomesConsumidos);
		setNomesInput(nomesRestantes.join('\n'));
		setFilaNomes([]);
		setNomesConsumidos(0);
	};

	const generateId = () => {
		return Date.now().toString(36) + Math.random().toString(36);
	};

	if (showQRScanner) {
		return (
			<QRScanner
				onQRDetected={handleQRDetected}
				onCancel={() => setShowQRScanner(false)}
			/>
		);
	}

	return (
		<div className="admin-container">
			<main className="admin-card">
				<header className="admin-card-header">
					<h2><i className="fa-solid fa-wrench"></i> Modo Administrador</h2>
				</header>

				{!calibrado ? (
					<section className="admin-card-body calibration-needed">
						<div className="status-badge nao-calibrado">
							<i className="fa-solid fa-qrcode"></i> Calibração Necessária
						</div>
						<p className="instructions">
							Para começar, aponte a câmera para o QR Code do evento para calibrar a posição.
						</p>
						<button className="botao btn-calibrar-admin" onClick={() => setShowQRScanner(true)}>
							Calibrar com QR Code
						</button>
					</section>

				) : (
					<section className="admin-card-body calibration-done">
						<div className="status-badge calibrado">
							<i className="fa-solid fa-check"></i> Sistema Calibrado
						</div>

						<div className="info-group">
							<div className="info-item">
								<span>Evento</span>
								<strong>{pontoReferencia.qrCode}</strong>
							</div>
							<div className="info-item">
								<span>Pontos Criados</span>
								<strong>{qntdPontos}</strong>
							</div>
						</div>

						{!showAR ? (
							<>
								<div className="names-input-section">
									<label htmlFor="nomes-input" className="input-label">
										<i className="fa-solid fa-list"></i> Digite os nomes dos pontos (um por linha):
									</label>
									<textarea
										id="nomes-input"
										className="names-textarea"
										value={nomesInput}
										onChange={(e) => setNomesInput(e.target.value)}
										placeholder="Entrada Principal&#10;Banheiros&#10;Palco Principal&#10;Estacionamento&#10;Food Court"
										rows={8}
									/>
									<div className="names-count">
										{nomesInput.split('\n').filter(n => n.trim()).length} pontos na fila
									</div>
								</div>

								<p className="instructions">
									Digite os nomes dos pontos que deseja criar, um em cada linha. 
									No modo AR, os nomes serão atribuídos automaticamente na ordem.
								</p>

								<div className="action-buttons">
									<button className="botao btn-recalibrar" onClick={() => setShowQRScanner(true)}>
										<i className="fa-solid fa-rotate-right"></i> Recalibrar
									</button>
									<button 
										className="botao btn-iniciar-ar" 
										onClick={handlePrepararNomes}
										disabled={!nomesInput.trim()}
									>
										<i className="fa-solid fa-play"></i> Iniciar AR
									</button>
								</div>
							</>
						) : (
							<div className="ar-active-info">
								<div className="progress-info">
									<i className="fa-solid fa-hourglass-half"></i>
									<span>
										Pontos criados nesta sessão: <strong>{nomesConsumidos}</strong> / {filaNomes.length}
									</span>
								</div>
								
								{nomesConsumidos < filaNomes.length ? (
									<div className="next-point-name">
										<i className="fa-solid fa-arrow-right"></i> 
										Próximo ponto: <strong>{filaNomes[nomesConsumidos]}</strong>
									</div>
								) : (
									<div className="warning-message">
										<i className="fa-solid fa-exclamation-triangle"></i>
										Todos os nomes foram usados. Novos pontos ficarão sem nome.
									</div>
								)}

								<button 
									className="botao btn-sair-ar" 
									onClick={handleVoltarParaEdicao}
								>
									<i className="fa-solid fa-stop"></i> Sair do AR
								</button>
							</div>
						)}
					</section>
				)}
			</main>

			{showAR && calibrado && (
				<ARView
					mode="admin"
					calibrado={calibrado}
					pontoReferencia={pontoReferencia}
					pontos={pontos}
					onCreatePoint={handleCreatePoint}
					consumirProximoNome={consumirProximoNome}
				/>
			)}
		</div>
	);
}

export default AdminScreen;
