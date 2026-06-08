// Variables globales para controlar los componentes de Bootstrap
let modalEditarBS;
let modalBorrarBS;
let toastBS;

// Variables temporales para guardar los datos del producto a eliminar
let productoIdParaBorrar = null;
let fotoUrlParaBorrar = null;

// Función para mostrar notificaciones flotantes temporales
function mostrarNotificacion(mensaje, tipo = "success") {
    const toastElement = document.getElementById("notificacionToast");
    const mensajeElement = document.getElementById("notificacionMensaje");

    if (!toastBS) {
        toastBS = new bootstrap.Toast(toastElement, { delay: 3000 });
    }

    toastElement.className = `toast align-items-center text-white border-0 shadow bg-${tipo === "success" ? "success" : "danger"}`;
    mensajeElement.textContent = mensaje;
    toastBS.show();
}

async function cargarProductos() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error("Error al cargar productos:", error);
        mostrarNotificacion("Error al conectar con la base de datos", "error");
        return;
    }

    if (!modalEditarBS) {
        modalEditarBS = new bootstrap.Modal(document.getElementById('editarModal'));
    }
    if (!modalBorrarBS) {
        modalBorrarBS = new bootstrap.Modal(document.getElementById('confirmarBorrarModal'));
    }

    window.productosCargados = data;

    const contenedor = document.getElementById("listaProductos");
    contenedor.innerHTML = "";

    data.forEach((producto, index) => {
        contenedor.innerHTML += `
            <div class="col-md-4">
                <div class="card h-100 shadow">
                    <img
                        src="${producto.foto_url}"
                        class="card-img-top"
                        alt="${producto.nombre}"
                        style="height:250px; object-fit:cover;">

                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${producto.nombre}</h5>
                        <p class="text-muted mb-2">${producto.categoria}</p>
                        <p class="card-text flex-grow-1">${producto.descripcion}</p>
                        
                        <div class="d-flex gap-2 mt-3">
                            <button class="btn btn-warning btn-sm w-50" onclick="abrirModalEditar(${index})">
                                Editar
                            </button>
                            <button class="btn btn-danger btn-sm w-50" onclick="solicitarConfirmacionBorrar(${producto.id}, '${producto.foto_url}')">
                                Borrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// ==========================================
// ACCIÓN: CREAR PRODUCTO
// ==========================================
document.getElementById("productoForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const formulario = document.getElementById("productoForm");
    const botonEnviar = formulario.querySelector('button[type="submit"]');

    botonEnviar.disabled = true;
    const textoOriginal = botonEnviar.innerHTML;
    botonEnviar.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...`;

    const foto = document.getElementById("foto").files[0];
    const nombre = document.getElementById("nombre").value;
    const categoria = document.getElementById("categoria").value;
    const descripcion = document.getElementById("descripcion").value;

    if (!foto) {
        mostrarNotificacion("Seleccioná una foto obligatoriamente", "error");
        botonEnviar.disabled = false;
        botonEnviar.innerHTML = textoOriginal;
        return;
    }

    try {
        const nombreArchivo = Date.now() + "_" + foto.name;

        const { error: errorUpload } = await supabaseClient.storage
            .from("productos")
            .upload(nombreArchivo, foto);

        if (errorUpload) throw errorUpload;

        const { data: urlData } = supabaseClient.storage
            .from("productos")
            .getPublicUrl(nombreArchivo);

        const foto_url = urlData.publicUrl;

        const { error: errorInsert } = await supabaseClient
            .from("productos")
            .insert({ nombre, categoria, descripcion, foto_url });

        if (errorInsert) throw errorInsert;

        mostrarNotificacion("Producto guardado correctamente", "success");
        formulario.reset();
        cargarProductos();

    } catch (error) {
        console.error("Error al guardar producto:", error);
        mostrarNotificacion("Hubo un error al guardar el producto", "error");
    } finally {
        botonEnviar.disabled = false;
        botonEnviar.innerHTML = textoOriginal;
    }
});

// ==========================================
// ACCIÓN: PREPARAR EL MODAL DE BORRADO
// ==========================================
function solicitarConfirmacionBorrar(id, fotoUrl) {
    // Guardamos los datos temporalmente en las variables globales
    productoIdParaBorrar = id;
    fotoUrlParaBorrar = fotoUrl;
    
    // Abrimos el modal de confirmación con diseño limpio
    modalBorrarBS.show();
}

// Evento que escucha el clic del botón "Eliminar" de adentro del modal lindo
document.getElementById("btnConfirmarBorrar").addEventListener("click", async () => {
    if (!productoIdParaBorrar) return;

    // Cerramos el modal de confirmación de inmediato
    modalBorrarBS.hide();

    try {
        if (fotoUrlParaBorrar && fotoUrlParaBorrar.includes("/")) {
            const nombreArchivo = fotoUrlParaBorrar.split("/").pop();
            if (nombreArchivo) {
                await supabaseClient.storage
                    .from("productos")
                    .remove([nombreArchivo]);
            }
        }
    } catch (errStorage) {
        console.warn("No se pudo remover la imagen del storage:", errStorage);
    }

    const { error } = await supabaseClient
        .from("productos")
        .delete()
        .eq("id", productoIdParaBorrar);

    // Limpiamos las variables temporales
    productoIdParaBorrar = null;
    fotoUrlParaBorrar = null;

    if (error) {
        console.error("Error de Supabase al borrar:", error);
        mostrarNotificacion("Error al borrar el producto en la base de datos", "error");
        return;
    }

    mostrarNotificacion("Producto eliminado exitosamente", "success");
    cargarProductos();
});

// ==========================================
// ACCIÓN: EDITAR (ABRIR MODAL Y RELLENAR)
// ==========================================
function abrirModalEditar(index) {
    const producto = window.productosCargados[index];

    document.getElementById("editId").value = producto.id;
    document.getElementById("editNombre").value = producto.nombre;
    document.getElementById("editCategoria").value = producto.categoria;
    document.getElementById("editDescripcion").value = producto.descripcion;
    document.getElementById("editFotoUrlActual").value = producto.foto_url;
    document.getElementById("editFoto").value = "";

    modalEditarBS.show();
}

// ==========================================
// ACCIÓN: ACTUALIZAR PRODUCTO
// ==========================================
document.getElementById("editarForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (document.activeElement) {
        document.activeElement.blur(); 
    }

    const id = document.getElementById("editId").value;
    const nombre = document.getElementById("editNombre").value;
    const categoria = document.getElementById("editCategoria").value;
    const descripcion = document.getElementById("editDescripcion").value;
    const nuevaFoto = document.getElementById("editFoto").files[0];
    let foto_url = document.getElementById("editFotoUrlActual").value;

    try {
        if (nuevaFoto) {
            if (foto_url && foto_url.includes("/")) {
                const nombreArchivoViejo = foto_url.split("/").pop();
                if (nombreArchivoViejo) {
                    await supabaseClient.storage.from("productos").remove([nombreArchivoViejo]);
                }
            }

            const nombreArchivoNuevo = Date.now() + "_" + nuevaFoto.name;
            const { error: errorUpload } = await supabaseClient.storage
                .from("productos")
                .upload(nombreArchivoNuevo, nuevaFoto);

            if (errorUpload) throw errorUpload;

            const { data: urlData } = supabaseClient.storage
                .from("productos")
                .getPublicUrl(nombreArchivoNuevo);

            foto_url = urlData.publicUrl;
        }

        const { error: errorUpdate } = await supabaseClient
            .from("productos")
            .update({ nombre, categoria, descripcion, foto_url })
            .eq("id", id);

        if (errorUpdate) throw errorUpdate;

        modalEditarBS.hide();
        
        setTimeout(() => {
            mostrarNotificacion("Producto modificado con éxito", "success");
            cargarProductos();
        }, 300);

    } catch (error) {
        console.error("Error crítico durante la actualización:", error);
        mostrarNotificacion("Hubo un error al guardar los cambios", "error");
    }
});

// EJECUCIÓN INICIAL
cargarProductos();