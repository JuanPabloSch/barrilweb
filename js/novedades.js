async function cargarNovedadesPublicas() {
    const contenedor = document.getElementById("listaNovedades");
    const loader = document.getElementById("cargando");

    try {
        // Pedimos los productos ordenados del más nuevo al más viejo
        const { data, error } = await supabaseClient
            .from("productos")
            .select("*")
            .order("id", { ascending: false });

        if (error) throw error;

        // Si no hay productos cargados todavía
        if (!data || data.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted fs-5">Por el momento no hay novedades disponibles. ¡Volvé pronto!</p>
                </div>
            `;
            return;
        }

        // Limpiamos el contenedor antes de renderizar
        contenedor.innerHTML = "";

        // Dibujamos las tarjetas dinámicamente con tus estilos originales
        data.forEach(producto => {
            // Creamos un mensaje personalizado para el enlace de WhatsApp
            const mensajeWhatsapp = encodeURIComponent(`¡Hola Barril Verde! Me interesa consultar por el producto: ${producto.nombre}`);
            const urlWhatsapp = `https://wa.me/5491132007610?text=${mensajeWhatsapp}`;

            contenedor.innerHTML += `
                <div class="col-md-4">
                    <div class="card drink-card h-100 shadow-sm">
                        <img 
                            src="${producto.foto_url}" 
                            class="card-img-top" 
                            alt="${producto.nombre}"
                            style="height: 250px; object-fit: cover;">
                        
                        <div class="card-body text-center d-flex flex-column">
                            <span class="badge bg-secondary mb-2 align-self-center text-uppercase fs-7 px-3">${producto.categoria}</span>
                            <h5 class="card-title fw-bold">${producto.nombre}</h5>
                            <p class="card-text flex-grow-1 text-muted small">${producto.descripcion}</p>
                            
                            <div class="mt-3">
                                <a href="${urlWhatsapp}" 
                                   target="_blank" 
                                   class="btn btn-success w-100 py-2fw-bold">
                                    Consultar
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error al traer las novedades:", error);
        contenedor.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-danger">Hubo un problema al cargar los productos. Por favor, intentá de nuevo más tarde.</p>
            </div>
        `;
    } finally {
        // Pase lo que pase, ocultamos la ruedita de carga (loader)
        if (loader) loader.style.display = "none";
    }
}

// Ejecutamos la consulta apenas entra el usuario a la web
document.addEventListener("DOMContentLoaded", cargarNovedadesPublicas);