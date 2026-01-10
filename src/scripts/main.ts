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
			let embedId = (el as HTMLElement).dataset.embedid
			let embedType = (el as HTMLElement).dataset.type
			let template = '';
			switch(embedType)
			{
				case "vimeo":
					template += `<iframe style="margin: auto;" title="vimeo-player" src="https://player.vimeo.com/video/${embedId ?? ''}" width="480" height="360" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" allowfullscreen onload="this.style.width='100%';"></iframe>`
					break;
				case "instagram": //instagram qué diantres???
					template += `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/reel/${embedId}/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: auto; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/reel/${embedId}/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this post on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/reel/${embedId}/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">A post shared by RCB studio (@rcbstudio_)</a></p></div></blockquote>
<script async src="//www.instagram.com/embed.js"></script>`
					break;

			}
			if(embedId != null) {
				Swal.fire({
					//icon: "info",
					title: title,
					html: template,
					width: 'max(50%,400px)',
					showCloseButton: true,
					showConfirmButton: false,
				})
				/*
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
				})*/
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
	//TODO: revisar envío de mensajes
	const contactForm = document.getElementById("contactForm")!
	const submitBtn = document.getElementById("formSubmit")!
	
	//https://formspree.io/f/mjkaaabv
	const sendForm = (e: SubmitEvent) => {
		e.preventDefault();
		//const url = "https://formspree.io/f/mjkaaabv";
		//const siteKey = (submitBtn as HTMLElement).dataset.sitekey ?? ''

		(document.getElementById('message') as HTMLInputElement).value += (document.getElementById('shortMessage') as HTMLInputElement);
		(document.getElementById('message') as HTMLInputElement).value += '\n' + (document.getElementById('phone') as HTMLInputElement);
		(document.getElementById('message') as HTMLInputElement).value += '\n' + (document.getElementById('budget') as HTMLInputElement);

		(e.target as HTMLFormElement).submit();

		/*let rawData = new FormData(e.target as HTMLFormElement)
		let data = Object.fromEntries(rawData.entries())
		data['message'] += `\nTeléfono: ${data['phone']}`
		data['message'] += `\nPresupuesto: ${data['budget']}`
		delete data['budget'];
		delete data['phone'];*/

		//delete data['_subject'];
		//delete data['_captcha'];
		//console.log(data)

		
		
		//(submitBtn as HTMLInputElement).disabled = true

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
		/*axios.post(url, data, {headers: { Accept: 'application/json' }})
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