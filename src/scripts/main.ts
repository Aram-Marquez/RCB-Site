import * as THREE from 'three'
// @ts-ignore: type declaration
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import Swal, { type SweetAlertOptions } from 'sweetalert2'
import { time } from 'three/tsl'
import axios from 'axios'

/*

Índice:

[MAIN-00] - Loader
[MAIN-01] - Modelo 3D inicio
[MAIN-02] - Carrusel de servicios
[MAIN-03] - Carrusel de trabajos recientes
[MAIN-04] - Tarjetas del equipo
[MAIN-05] - Contacto
[MAIN-06] - Misceláneo

*/

document.addEventListener("DOMContentLoaded", (e) => {

	// == [MAIN-00] LOADER ==
	const loader = document.getElementById('loader')!
	loader.dataset.loaded = "true"

	document.body.dataset.loaded = "true"

	const fadeClassList = [ 
		"fade-left", "fade-right", "fade-up", "fade-down",
		"fade-in"
	]

	const recentCarousel = document.getElementById('recentProjectsCarousel')!
	const recentDescriptions = document.getElementById('recentProjectsDescriptions')!

	let animateEls = fadeClassList.map((className: string): Element[] => {
		return [...document.getElementsByClassName(className)]
	}).flat()

	const observer = new IntersectionObserver((entries, obs) => {
		for(let entry of entries) {
			if (entry.isIntersecting) {
				//setTimeout(() => {
				const elements = fadeClassList.map((className: string): Element[] => {
					let els = [...entry.target.getElementsByClassName(className)]
					
					if((entry.target as HTMLElement).dataset.relay != null) {
						let relay = document.getElementById((entry.target as HTMLElement).dataset.relay!)!
						els.push(...relay.getElementsByClassName(className))
					}

					return els
				}).flat()
				for(let el of elements) el.classList.remove(...fadeClassList)
				//entry.target.classList.remove(...fadeClassList)
				obs.unobserve(entry.target);
				//}, 250)
			}
		}
	}, { threshold: 0.5 })


	if(document.body.getBoundingClientRect().y < 0) {
		//console.log("cargado debajo de inicio")
		setTimeout(() => {
			for(let el of animateEls)
			{
				el.classList.remove(...fadeClassList)
			}
	
		}, 250)
	}
	else {
		//console.log("cargado en inicio")
		const sectionEls = document.getElementsByClassName("section")
		for(let el of sectionEls) {
			observer.observe(el)
		}
	}



	// == [MAIN-01] MODELO 3D INICIO ==
	
	const container3d = document.getElementById("start3D")!;
	const start2d = document.getElementById("start2D")!;
	let scene: THREE.Scene
	let camera: THREE.PerspectiveCamera
	let renderer: THREE.WebGLRenderer
	let mixer: THREE.AnimationMixer
	let group: THREE.Group;

	let imgToShow = start2d.children[Math.floor(Math.random() * start2d.children.length)]
	imgToShow.classList.remove('hidden')

	let objToRender//: 'delight' | 'archie1'
	objToRender = (imgToShow as HTMLElement).dataset.name ?? 'delight'

	let rotationSpeed = -0.01;
	let container3dVisible = false;
	//let mouse: THREE.Vector2;
	//let rayCaster: THREE.Raycaster; //TODO retirar

	if(hasWebGLSupport())
	{
		scene = new THREE.Scene();
		const ratio = container3d.getBoundingClientRect().width / container3d.getBoundingClientRect().height
		camera = new THREE.PerspectiveCamera(50, ratio, 0.1, 1000)
	
		const clock = new THREE.Clock();
	
		let obj: any;
	
		//const axesHelper = new THREE.AxesHelper(5)
		//rayCaster = new THREE.Raycaster()
		//mouse = new THREE.Vector2()
		let loadStart = new Date()
		
		const gltfLoader = new GLTFLoader();
		gltfLoader.load(
			//"./assets/delight.glb",
			`./assets/${objToRender}.glb`,
			function (gltf: any) {
				start2d.style.opacity = '0';
				start2d.style.transitionDelay = '0s'
				//container3d.style.opacity = '1'
				//fadeTranslate = 'translate(50%,0);';
				obj = gltf.scene;
				
				//envuelve en un grupo para centrar la geometría
				const box = new THREE.Box3().setFromObject(gltf.scene);
				const center = box.getCenter(new THREE.Vector3());
				gltf.scene.position.sub(center);
				
				group = new THREE.Group();
				group.add(obj)
				scene.add(group)
	

				if(objToRender == 'delight')
				{
					group.rotation.y -= Math.PI/3
					group.scale.set(0.5,0.5,0.5)
					container3d.style.cursor = 'grab'
				}
				else if(objToRender == 'archie1')
				{
					group.scale.set(0.7,0.7,0.7)

					mixer = new THREE.AnimationMixer(obj)
					//console.log("animaciones",gltf.animations)
					mixer.clipAction(gltf.animations[0]).play();
		
					renderer.setAnimationLoop(mixerLoop)
				}
				//realiza la animación de fade. No se usa el sistema estándar ya que transformar el padre cambia el contenedor a static durante la transición
				//i.e., con el efecto de paralaje, esto es necesario

				let loadDiff = 750 - (new Date().getTime() - loadStart.getTime());
				if(loadDiff < 0){
					loadDiff = 0;
					renderer.domElement.style.transition = 'opacity 750ms ease-in-out';
				}

				setTimeout(() => {
					renderer.domElement.style.opacity = '1';
					renderer.domElement.style.transform = 'translate(0,0)';
				}, loadDiff)
				//fin workaround animación
	
			},
			function(_xhr: any) {
				//console.log((xhr.loaded / xhr.total * 100) + ' % loaded' )
			},
			function (error: any) {
				console.log(error)
			}
		)
	
		renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
		renderer.setSize(container3d.getBoundingClientRect().width, container3d.getBoundingClientRect().height)
	


		container3d.appendChild(renderer.domElement)
		

		camera.position.z = 1
	
		const topLight = new THREE.DirectionalLight(0xffffff, 1);
		topLight.position.set(0,1.5,-1.5)
		topLight.castShadow = false;
		scene.add(topLight)
		const ambientLight = new THREE.AmbientLight(0xffffff, 1)
		scene.add(ambientLight)
		//scene.add(axesHelper)
	
		
		function mixerLoop () {
			//obj.rotation.y = -1.51;
			const delta = clock.getDelta();
			mixer.update(delta);
		} 
	
		let prevX = 0;
		const canvas3dmouseDown: any = (e: MouseEvent) => {
			//e.preventDefault();
			//console.log("rotación", obj.rotation.y)
			(e.target as HTMLElement).onmousemove = canvas3dmouseMove;
			(e.target as HTMLElement).onmouseup = canvas3dmouseUp;
			(e.target as HTMLElement).onmouseleave = canvas3dmouseUp;
			prevX = e.clientX;
		}
	
		const canvas3dmouseMove: any = (e: MouseEvent) => {
			e.preventDefault();
			let diff = (e.clientX - prevX);
			if(Math.abs(diff) <= 1) 
				rotationSpeed = 0
			else
				rotationSpeed = diff/100
			prevX = e.clientX
			
		}
	
		const canvas3dmouseUp: any = (e: MouseEvent) => {
			(e.target as HTMLElement).onmousemove = null;
			(e.target as HTMLElement).onmouseup = null;
			(e.target as HTMLElement).onmouseleave = null;
		}
	
		container3d.addEventListener("mousedown", canvas3dmouseDown)
		container3d.addEventListener("dblclick", (e) => {
			if(rotationSpeed == 0)
				rotationSpeed = (1/3) * (Math.random() > 0.5 ? 1 : -1);
			else
				rotationSpeed = (1/3) * Math.sign(rotationSpeed)
		})	

		/* container3d.addEventListener("mousemove", (e) => {
			let bounds = (e.target as Element).getBoundingClientRect()
			mouse.x = ((e.clientX - bounds.x) / bounds.width) * 2 - 1;
			mouse.y = -((e.clientY - bounds.y) / bounds.height) * 2 + 1;
		}) */

	}
	else {
		//console.log("No webgl support")
		container3d.style.display = 'none'
	}

	const container3dRender = (_timestamp: CSSNumberish, delta: number) => {
		if(scene == null || camera == null || group == null /*|| mouse == null || rayCaster == null*/) return
		renderer.render(scene, camera)

		//bastante poderoso con archie
		/* rayCaster.setFromCamera(mouse, camera)
		let intersects = rayCaster.intersectObject(group)
		if(intersects.length > 0) {
			container3d.style.cursor = 'grab'
		} else {
			container3d.style.cursor = 'auto'
		} */
	}

	const container3dLogic = (_timestamp: CSSNumberish, delta: number) => {
		if(group == null) return

		if(objToRender == 'delight')
			group.rotation.y += rotationSpeed * ((delta*60)/1000)

		if(Math.abs(rotationSpeed) > 0.01)
		{
			rotationSpeed *= 0.98;
		}
	}

	const observer3d = new IntersectionObserver((entries, obs) => {
		for(let entry of entries) {
			if (entry.isIntersecting) container3dVisible = true
			else container3dVisible = false
		}
	})

	observer3d.observe(container3d)

	const canvas3dresize = () => {
		if(camera == null || renderer == null) return
		//camera.aspect = 1
		camera.aspect = container3d.getBoundingClientRect().width / container3d.getBoundingClientRect().height
		camera.updateProjectionMatrix();
		renderer.setSize(container3d.getBoundingClientRect().width, container3d.getBoundingClientRect().height)
	}

	// == [MAIN-02] CARRUSEL DE SERVICIOS ==

	const servicesCarousel = document.getElementById("servicesCarousel")!
	let servicesCarouselFocused = false;
	let servicesCarouselDirection = 1;
	let servicesCarouselSpeed = 1;
	
	let servicesCarouselScrollPrev = 0;
	let servicesCarouselAutoScroll = false;

	servicesCarousel.scrollLeft = servicesCarousel.scrollWidth/3

	/* let servicesCarouselIsScrolling = false;
	function servicesCarouselScrollHandler(e: Event) {
		if(!servicesCarouselIsScrolling)
		{
			servicesCarouselIsScrolling = true;
			requestAnimationFrame(() => {
				const el = (e.target as HTMLElement)
				const halfWidth = el.getBoundingClientRect().width / 2;
				
				servicesCarouselDirection = Math.sign(servicesCarousel.scrollLeft - servicesCarouselScrollPrev)
				servicesCarouselScrollPrev = servicesCarousel.scrollLeft;
				
				//pequeña unidad para evitar caer en la otra condición inmediatamente.
				if((el.scrollLeft + halfWidth) > el.scrollWidth*(2/3)) {
					el.scrollTo({left: el.scrollWidth/3 - halfWidth + 1})
					servicesCarouselScrollPrev = 0
				}
				if((el.scrollLeft + halfWidth) < el.scrollWidth/3) {
					el.scrollTo({left: el.scrollWidth*(2/3) - halfWidth - 1})
					servicesCarouselScrollPrev = servicesCarousel.scrollWidth
				}
				servicesCarouselIsScrolling = false;
			})
		}
			
	}

	setTimeout( () => {
		servicesCarousel.addEventListener("scroll", servicesCarouselScrollHandler, {passive: true})
		servicesCarouselAutoScroll = true
	}, 1000) */

	servicesCarousel.addEventListener("mousemove", (e) => {
		let bounds = (servicesCarousel as HTMLElement).getBoundingClientRect()
		let threshold = 32
		if(e.clientX < bounds.x + threshold) {
			servicesCarouselFocused = false
			servicesCarouselScrollPrev = servicesCarousel.scrollWidth
			servicesCarouselDirection = 1
			servicesCarouselSpeed = Math.min(bounds.x + threshold - e.clientX, 20)
		}
		else if(e.clientX > bounds.x + bounds.width - threshold)
		{
			servicesCarouselFocused = false
			servicesCarouselScrollPrev = 0
			servicesCarouselDirection = -1
			servicesCarouselSpeed = Math.min(e.clientX + threshold - bounds.x - bounds.width, 20)
		}
		else {
			servicesCarouselFocused = true
		}
	})
	
	servicesCarousel.addEventListener("pointerleave", (e) => {
		servicesCarouselFocused = false
		servicesCarouselSpeed = 1
	})

	const observerServices = new IntersectionObserver((entries, obs) => {
		for(let entry of entries) {
			if (entry.isIntersecting) servicesCarouselAutoScroll = true
			else servicesCarouselAutoScroll = false
		}
	})

	observerServices.observe(servicesCarousel)
	
	// == [MAIN-03] CARRUSEL DE TRABAJOS RECIENTES ==
	
	const nextElement = (el: Element, collectionLength: number) => {
		let pos = parseInt((el as HTMLElement).dataset.position ?? '')
		pos++;
		if(pos > collectionLength / 2) pos -= collectionLength;
		else if(pos < collectionLength / -2) pos += collectionLength; 
		(el as HTMLElement).dataset.position = pos.toString();
	}

	const prevElement = (el: Element, collectionLength: number) => {
		let pos = parseInt((el as HTMLElement).dataset.position ?? '')
		pos--;
		if(pos > collectionLength / 2) pos -= collectionLength;
		else if(pos < collectionLength / -2) pos += collectionLength; 
		(el as HTMLElement).dataset.position = pos.toString();
	}
	
	document.getElementById("recentNext")!.onclick = () => {
		let carouselLength = recentCarousel.children.length;
		for(let el of recentCarousel.children)
		{
			nextElement(el, carouselLength)
		}
		for(let el of recentDescriptions.children)
		{
			nextElement(el, carouselLength)
		}
	}
	
	document.getElementById("recentPrevious")!.onclick = () => {
		let carouselLength = recentCarousel.children.length;
		for(let el of recentCarousel.children)
		{
			prevElement(el, carouselLength)
		}
		for(let el of recentDescriptions.children)
		{
			prevElement(el, carouselLength)
		}
	}

	for(let el of recentCarousel.children) {
		(el as HTMLElement).addEventListener("click", (e) => {
			let pos = parseInt((el as HTMLElement).dataset.position ?? '')
			if(pos != 0) return
			let title = (el as HTMLElement).dataset.title
			let url = (el as HTMLElement).dataset.url
			if(url != null) {
				Swal.fire({
					icon: "info",
					title: title,
					text: `¿Quieres navegar hacia ${url}?`,
					showDenyButton: true,
					confirmButtonText: "Sí",
					denyButtonText: "No"
				})
				.then(r => {
					if (r.isConfirmed)
						window.open(url, '_blank')?.focus()
				})
			}
		})
	}

	// == [MAIN-04] TARJETAS DEL EQUIPO ==

	const aboutUsCards = document.getElementsByClassName("about-us")

	const flipCard = (e: Event) => {
		const el = e.target;
		(el as HTMLElement).children[0].classList.add("about-us-flipped")
	}

	const unflipCard = (e: Event) => {
		const el = e.target;
		(el as HTMLElement).children[0].classList.remove("about-us-flipped")
	}

	for(let card of aboutUsCards) {
		(card as HTMLElement).onmouseenter = flipCard;
		(card as HTMLElement).onmouseleave = unflipCard;
	}

	// == [MAIN-05] CONTACTO ==
	const contactForm = document.getElementById("contactForm")!
	const submitBtn = document.getElementById("formSubmit")!
	
	//https://formspree.io/f/mjkaaabv
	const sendForm = (e: SubmitEvent) => {
		const url = "https://formspree.io/f/mjkaaabv";
		const siteKey = (submitBtn as HTMLElement).dataset.sitekey ?? ''

		e.preventDefault()
		let rawData = new FormData(e.target as HTMLFormElement)
		let data = Object.fromEntries(rawData.entries())
		data['message'] += `\nTeléfono: ${data['phone']}`
		data['message'] += `\nPresupuesto: ${data['budget']}`
		delete data['budget'];
		delete data['phone'];
		//delete data['_subject'];
		delete data['_captcha'];
		//console.log(data)
		
		(submitBtn as HTMLInputElement).disabled = true

		//@ts-ignore
		//const googleReCaptcha = grecaptcha;
		//@ts-ignore
		const googleReCaptcha = grecaptcha.enterprise;


		googleReCaptcha.ready(async () => {
			const token = await googleReCaptcha.execute(siteKey, {action: 'sendMessage'});
			data['g-recaptcha-response'] = token;

			//debugger; //Debugear antes de enviar el mensaje

			let successAlert: SweetAlertOptions = {
				title: "¡Gracias!",
				text: "Pronto nos comunicaremos contigo",
				icon: "success"
			}

			let errorAlert: SweetAlertOptions = {
				title: "Algo salió mal...",
				text: "Por favor, intenta de nuevo más tarde",
				icon: "error"
			}
			axios.post(url, data, {headers: { Accept: 'application/json' }})
			//new Promise<any>((resolve, reject) => setTimeout(() => { resolve({status: 200}) }, 5000))
			.then(r => {
				if(r.status == 200) {
					Swal.fire(successAlert);
					(e.target as HTMLFormElement).reset()
				}
				else {
					Swal.fire(errorAlert)
					console.log(r)
				}
				(submitBtn as HTMLInputElement).disabled = false
				googleReCaptcha.reset(siteKey)
			})
			.catch(e => {
				Swal.fire(errorAlert)
				console.log(e);
				(submitBtn as HTMLInputElement).disabled = false
				googleReCaptcha.reset(siteKey)
			}) 
		});

		/*let successAlert: SweetAlertOptions = {
			title: "¡Gracias!",
			text: "Pronto nos comunicaremos contigo",
			icon: "success"
		}

		let errorAlert: SweetAlertOptions = {
			title: "Algo salió mal...",
			text: "Por favor, intenta de nuevo más tarde",
			icon: "error"
		}
		axios.post(url, data, {headers: { Accept: 'application/json' }})
		//new Promise<any>((resolve, reject) => setTimeout(() => { resolve({status: 200}) }, 5000))
		.then(r => {
			if(r.status == 200) {
				Swal.fire(successAlert);
				(e.target as HTMLFormElement).reset()
			}
			else {
				Swal.fire(errorAlert)
				console.log(r)
			}
			(submitBtn as HTMLInputElement).disabled = false
		})
		.catch(e => {
			Swal.fire(errorAlert)
			console.log(e);
			(submitBtn as HTMLInputElement).disabled = false
		}) */
	}

	contactForm.addEventListener("submit", sendForm)
	
	// == [MAIN-06] MISCELÁNEO ==

	function hasWebGLSupport(): boolean { 
		try {
			var canvas = document.createElement('canvas'); 
			return !!window.WebGLRenderingContext &&
			(!!canvas.getContext('webgl') || !!canvas.getContext('experimental-webgl'));
		} catch(e) {
			return false;
		}
	}

	let lastFrame: CSSNumberish;
	
	function animate(timestamp: CSSNumberish = document.timeline.currentTime ?? 0) {
		
		const delta = (timestamp as number) - (lastFrame as number);
		
		if (container3dVisible) container3dRender(timestamp, delta)
		container3dLogic(timestamp, delta)


		if(!servicesCarouselFocused && servicesCarouselAutoScroll) {
			servicesCarousel.scrollTo({ left: servicesCarousel.scrollLeft + ( servicesCarouselSpeed * servicesCarouselDirection * ((delta*60)/1000) ) })
		}

		//código del evento scroll
		const halfWidth = servicesCarousel.getBoundingClientRect().width / 2;
		//pequeña unidad para evitar caer en la otra condición inmediatamente.
		if((servicesCarousel.scrollLeft + halfWidth) > servicesCarousel.scrollWidth*(2/3)) {
			servicesCarousel.scrollTo({left: servicesCarousel.scrollWidth/3 - halfWidth + 1})
			servicesCarouselScrollPrev = 0
		}
		if((servicesCarousel.scrollLeft + halfWidth) < servicesCarousel.scrollWidth/3) {
			servicesCarousel.scrollTo({left: servicesCarousel.scrollWidth*(2/3) - halfWidth - 1})
			servicesCarouselScrollPrev = servicesCarousel.scrollWidth
		}

		lastFrame = timestamp
		requestAnimationFrame(animate)
	}
	animate()

	window.addEventListener("resize", (_e) => {
		canvas3dresize()
		
	})
	
})