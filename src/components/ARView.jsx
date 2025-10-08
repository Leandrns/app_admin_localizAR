import { useRef, useEffect } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { supabase } from '../supabaseClient';

function ARView({ calibrado, pontoReferencia, pontos, onCreatePoint }) {
	const containerRef = useRef(null);
	const sceneRef = useRef(null);
	const rendererRef = useRef(null);
	const cameraRef = useRef(null);
	const reticleRef = useRef(null);
	const controllerRef = useRef(null);
	const hitTestSourceRef = useRef(null);
	const localReferenceSpaceRef = useRef(null);
	const loaderRef = useRef(new GLTFLoader());

	useEffect(() => {
		if (calibrado && containerRef.current) {
			initAR();
		}

		return () => {
			cleanup();
		};
	}, [calibrado]);

	const initAR = () => {
		const container = containerRef.current;
		if (!container) return;

		const scene = new THREE.Scene();
		sceneRef.current = scene;

		const camera = new THREE.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.01,
			20
		);
		cameraRef.current = camera;

		const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
		light.position.set(0.5, 1, 0.25);
		scene.add(light);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.position.set(1, 1, 1);
		scene.add(directionalLight);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.xr.enabled = true;
		rendererRef.current = renderer;

		container.appendChild(renderer.domElement);

		const arButton = ARButton.createButton(renderer, {
			requiredFeatures: ["hit-test"],
		});
		container.appendChild(arButton);

		// Reticle para admin criar pontos
		const geometry = new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2);
		const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		const reticle = new THREE.Mesh(geometry, material);
		reticle.matrixAutoUpdate = false;
		reticle.visible = false;
		reticleRef.current = reticle;
		scene.add(reticle);

		const controller = renderer.xr.getController(0);
		controller.addEventListener("select", onSelect);
		controllerRef.current = controller;
		scene.add(controller);

		renderer.xr.addEventListener("sessionstart", onSessionStart);
		renderer.xr.addEventListener("sessionend", onSessionEnd);
		window.addEventListener("resize", onWindowResize);

		animate();
	};

	const onSessionStart = () => {
		const renderer = rendererRef.current;
		if (!renderer) return;

		const session = renderer.xr.getSession();

		session.requestReferenceSpace("viewer").then((viewerReferenceSpace) => {
			session.requestHitTestSource({ space: viewerReferenceSpace }).then((source) => {
				hitTestSourceRef.current = source;
			});
		});

		session.requestReferenceSpace("local").then((refSpace) => {
			localReferenceSpaceRef.current = refSpace;

			if (calibrado && pontoReferencia) {
				if (!pontoReferencia.arPosition) {
					pontoReferencia.arPosition = new THREE.Vector3(0, 0, 0);
				}

				setTimeout(() => {
					carregarPontosSalvos();
				}, 1000);
			}
		});
	};

	const onSessionEnd = () => {
		hitTestSourceRef.current = null;
		localReferenceSpaceRef.current = null;
		if (reticleRef.current) {
			reticleRef.current.visible = false;
		}
		limparObjetosAR();
	};

	const onSelect = () => {
		if (!calibrado) {
			alert("Faça a calibração primeiro!");
			return;
		}
		if (!reticleRef.current || !reticleRef.current.visible) return;

		const position = new THREE.Vector3();
		position.setFromMatrixPosition(reticleRef.current.matrix);

		const posicaoRelativa = calcularPosicaoRelativa(position);

		loaderRef.current.load(
			"/map_pointer_3d_icon.glb",
			(gltf) => {
				const model = gltf.scene;
				model.position.copy(position);
				model.position.y += 1;
				model.scale.set(0.1, 0.1, 0.1);

				model.userData = {
					carregado: true,
					dadosOriginais: posicaoRelativa,
				};

				const cor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
				model.traverse((child) => {
					if (child.isMesh) {
						if (child.material) child.material = child.material.clone();
						child.material.color = cor;
					}
				});

				sceneRef.current.add(model);

				if (onCreatePoint) onCreatePoint(posicaoRelativa);
			},
			undefined,
			(error) => {
				console.error("Erro ao carregar modelo:", error);
				criarCuboFallback(position, posicaoRelativa);
			}
		);
	};

	const criarCuboFallback = (position, posicaoRelativa) => {
		const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		const material = new THREE.MeshLambertMaterial({
			color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
		});
		const cube = new THREE.Mesh(geometry, material);
		cube.position.copy(position);
		cube.position.y += 0.05;

		cube.userData = {
			carregado: true,
			dadosOriginais: posicaoRelativa,
		};

		sceneRef.current.add(cube);

		if (onCreatePoint) {
			onCreatePoint(posicaoRelativa);
		}
	};

	const carregarPontosSalvos = async () => {
		if (!calibrado || !pontoReferencia) return;

		try {
			const { data, error } = await supabase
				.from("pontos")
				.select("*")
				.eq("qr_referencia", pontoReferencia.qrCode);

			if (error) {
				console.error("Erro ao carregar pontos do Supabase:", error.message);
				return;
			}

			console.log(`Carregando ${data.length} pontos do banco para modo admin...`);

			data.forEach((ponto, index) => {
				const posicaoAbsoluta = new THREE.Vector3(
					ponto.pos_x,
					ponto.pos_y,
					ponto.pos_z
				);

				if (pontoReferencia.arPosition) {
					posicaoAbsoluta.add(pontoReferencia.arPosition.clone());
				}

				criarModeloCarregado(posicaoAbsoluta, ponto, index);
			});
		} catch (err) {
			console.error("Erro inesperado ao buscar pontos:", err);
		}
	};

	const criarModeloCarregado = (posicao, dadosPonto, index) => {
		loaderRef.current.load(
			"/map_pointer_3d_icon.glb",
			(gltf) => {
				const model = gltf.scene;
				model.position.copy(posicao);
				model.position.y += 1;
				model.scale.set(0.1, 0.1, 0.1);

				model.userData = {
					carregado: true,
					dadosOriginais: dadosPonto,
				};

				const cor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);

				model.traverse((child) => {
					if (child.isMesh) {
						if (child.material) child.material = child.material.clone();
						child.material.color = cor;
					}
				});

				sceneRef.current.add(model);
			},
			undefined,
			(error) => {
				console.error("Erro ao carregar modelo:", error);
				criarCuboCarregado(posicao, dadosPonto, index);
			}
		);
	};

	const criarCuboCarregado = (posicao, dadosPonto, index) => {
		const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		const hue = (index * 0.1) % 1;
		const cor = new THREE.Color().setHSL(hue, 0.5, 0.4);

		const material = new THREE.MeshLambertMaterial({ color: cor });
		const cube = new THREE.Mesh(geometry, material);
		cube.position.copy(posicao);
		cube.position.y += 0.05;

		cube.userData = {
			carregado: true,
			dadosOriginais: dadosPonto,
		};

		sceneRef.current.add(cube);
	};

	const calcularPosicaoRelativa = (posicaoAR) => {
		if (!pontoReferencia || !pontoReferencia.arPosition) {
			return posicaoAR.clone();
		}
		return posicaoAR.clone().sub(pontoReferencia.arPosition);
	};

	const limparObjetosAR = () => {
		if (!sceneRef.current) return;

		const objetosParaRemover = [];
		sceneRef.current.traverse((child) => {
			if (
				child.isMesh &&
				(child.geometry?.type === "BoxGeometry" || child.userData?.carregado)
			) {
				objetosParaRemover.push(child);
			}
		});

		objetosParaRemover.forEach((obj) => {
			if (obj.parent) obj.parent.remove(obj);
			if (obj.geometry) obj.geometry.dispose();
			if (obj.material) {
				if (Array.isArray(obj.material)) {
					obj.material.forEach((m) => m.dispose && m.dispose());
				} else {
					obj.material.dispose && obj.material.dispose();
				}
			}
		});
	};

	const onWindowResize = () => {
		const camera = cameraRef.current;
		const renderer = rendererRef.current;

		if (camera && renderer) {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}
	};

	const animate = () => {
		const renderer = rendererRef.current;
		if (renderer) {
			renderer.setAnimationLoop(render);
		}
	};

	const render = (timestamp, frame) => {
		const renderer = rendererRef.current;
		const scene = sceneRef.current;
		const camera = cameraRef.current;
		const reticle = reticleRef.current;
		const hitTestSource = hitTestSourceRef.current;
		const localReferenceSpace = localReferenceSpaceRef.current;

		if (frame && hitTestSource && localReferenceSpace) {
			const hitTestResults = frame.getHitTestResults(hitTestSource);

			if (hitTestResults.length > 0) {
				const hit = hitTestResults[0];
				const pose = hit.getPose(localReferenceSpace);

				if (reticle) {
					reticle.visible = calibrado;
					if (reticle.visible) {
						reticle.matrix.fromArray(pose.transform.matrix);
					}
				}
			} else {
				if (reticle) {
					reticle.visible = false;
				}
			}
		}

		if (renderer && scene && camera) {
			renderer.render(scene, camera);
		}
	};

	const cleanup = () => {
		if (rendererRef.current) {
			rendererRef.current.setAnimationLoop(null);

			if (rendererRef.current.xr.getSession && rendererRef.current.xr.getSession()) {
				rendererRef.current.xr.getSession().end();
			}
		}

		window.removeEventListener("resize", onWindowResize);

		limparObjetosAR();

		if (containerRef.current) {
			containerRef.current.innerHTML = "";
		}
	};

	return (
		<div
			ref={containerRef}
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				zIndex: 1,
			}}
		/>
	);
}

export default ARView;