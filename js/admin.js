// Variable global para controlar el Modal de Bootstrap
let modalEditarBS;

async function cargarProductos() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error("Error al cargar productos:", error);
        return;
    }

    // Inicializamos el objeto modal si todavía no se creó
    if (!modalEditarBS) {
        modalEditarBS = new bootstrap.Modal(document.getElementById('editarModal'));
    }

    // Guardamos los datos de Supabase globalmente para recuperarlos al editar
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
                            <button class="btn btn-danger btn-sm w-50" onclick="eliminarProducto(${producto.id}, '${producto.foto_url}')">
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
// ACCIÓN: DETECTAR ENVÍO DEL FORM PRINCIPAL (CREAR)
// ==========================================
document.getElementById("productoForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const foto = document.getElementById("foto").files[0];
    const nombre = document.getElementById("nombre").value;
    const categoria = document.getElementById("categoria").value;
    const descripcion = document.getElementById("descripcion").value;

    if (!foto) {
        alert("Seleccioná una foto");
        return;
    }

    const nombreArchivo = Date.now() + "_" + foto.name;

    const { error: errorUpload } = await supabaseClient.storage
        .from("productos")
        .upload(nombreArchivo, foto);

    if (errorUpload) {
        console.error("Error al subir imagen:", errorUpload);
        alert("Error subiendo imagen");
        return;
    }

    const { data: urlData } = supabaseClient.storage
        .from("productos")
        .getPublicUrl(nombreArchivo);

    const foto_url = urlData.publicUrl;

    const { error: errorInsert } = await supabaseClient
        .from("productos")
        .insert({ nombre, categoria, descripcion, foto_url });

    if (errorInsert) {
        console.error("Error al insertar producto:", errorInsert);
        alert("Error guardando producto");
        return;
    }

    alert("Producto guardado correctamente");
    document.getElementById("productoForm").reset();
    cargarProductos();
});


// ==========================================
// ACCIÓN: ELIMINAR PRODUCTO (Y SU FOTO)
// ==========================================
async function eliminarProducto(id, fotoUrl) {
    if (!confirm("¿Seguro que querés borrar este producto? Esta acción no tiene vuelta atrás.")) {
        return;
    }

    try {
        // 1. Intentamos remover el archivo del Storage de forma segura
        if (fotoUrl && fotoUrl.includes("/")) {
            const nombreArchivo = fotoUrl.split("/").pop();
            if (nombreArchivo) {
                await supabaseClient.storage
                    .from("productos")
                    .remove([nombreArchivo]);
            }
        }
    } catch (errStorage) {
        // Si falla el borrado de la foto por alguna razón, registramos el error pero no frenamos el borrado del dato
        console.warn("No se pudo borrar la foto del storage, procediendo con el registro de datos:", errStorage);
    }

    // 2. Borramos el registro en la base de datos
    const { error } = await supabaseClient
        .from("productos")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error de Supabase al borrar:", error);
        alert("Error al borrar el producto en la base de datos");
        return;
    }

    alert("Producto eliminado exitosamente");
    cargarProductos();
}


// ==========================================
// ACCIÓN: EDITAR (ABRIR MODAL Y RELLENAR)
// ==========================================
function abrirModalEditar(index) {
    const producto = window.productosCargados[index];

    // Rellenamos el formulario del modal con los datos actuales
    document.getElementById("editId").value = producto.id;
    document.getElementById("editNombre").value = producto.nombre;
    document.getElementById("editCategoria").value = producto.categoria;
    document.getElementById("editDescripcion").value = producto.descripcion;
    document.getElementById("editFotoUrlActual").value = producto.foto_url;
    
    // Limpiamos el input de archivo por si había quedado algo seleccionado antes
    document.getElementById("editFoto").value = "";

    // Mostramos el modal en pantalla
    modalEditarBS.show();
}


// ==========================================
// ACCIÓN: ENVIAR ACTUALIZACIÓN DESDE EL MODAL (CORREGIDO)
// ==========================================
document.getElementById("editarForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // SOLUCIÓN AL ERROR DE ACCESIBILIDAD: Quitamos el foco del botón inmediatamente
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
        // Si el usuario decidió cambiar la imagen del ítem
        if (nuevaFoto) {
            // Intentamos borrar la imagen vieja del bucket de forma segura
            if (foto_url && foto_url.includes("/")) {
                const nombreArchivoViejo = foto_url.split("/").pop();
                if (nombreArchivoViejo) {
                    await supabaseClient.storage.from("productos").remove([nombreArchivoViejo]);
                }
            }

            // Subimos la nueva foto
            const nombreArchivoNuevo = Date.now() + "_" + nuevaFoto.name;
            const { error: errorUpload } = await supabaseClient.storage
                .from("productos")
                .upload(nombreArchivoNuevo, nuevaFoto);

            if (errorUpload) throw errorUpload;

            // Conseguimos la nueva URL pública
            const { data: urlData } = supabaseClient.storage
                .from("productos")
                .getPublicUrl(nombreArchivoNuevo);

            foto_url = urlData.publicUrl;
        }

        // Actualizamos las columnas correspondientes en Supabase
        const { error: errorUpdate } = await supabaseClient
            .from("productos")
            .update({ nombre, categoria, descripcion, foto_url })
            .eq("id", id);

        if (errorUpdate) throw errorUpdate;

        // Primero ocultamos el modal de forma limpia
        modalEditarBS.hide();
        
        // Esperamos 300ms a que la animación de cierre termine antes de mostrar el alert y recargar
        setTimeout(() => {
            alert("Producto modificado con éxito");
            cargarProductos();
        }, 300);

    } catch (error) {
        console.error("Error crítico durante la actualización:", error);
        alert("Hubo un error al guardar los cambios en la base de datos.");
    }
});


// EJECUCIÓN INICIAL
cargarProductos();