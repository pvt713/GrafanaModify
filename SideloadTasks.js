//del file cogemos su value en la posicion 0 ya que en este es donde esta el contenido
const file = context.panel.elements.find(el => el.id === "yml").value[0];
if (!file) return;

let newWarnValue = "", newCritValue = "";  // Declaramos las variables fuera del onload como vacias

// Función para leer el archivo YAML
function readFileAndParse(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const yamlText = e.target.result;  // Recoge el contenido del archivo
      console.log("Contenido del archivo YAML:", yamlText);

      // Separamos por el salto de lineas el archivo
      const lines = yamlText.split('\n');

      if (lines.length >= 1) {
        if (lines[0].split(":") === "") { //Comprobar si el archivo esta vacio
          throw new Error("Archivo .yml vacio");
        }
        else {
          newWarnValue = lines[0].split(':')[1].trim(); //La primera línea debe tener formato "key: value"
          console.log(newWarnValue);
        }
      }
      if (lines.length >= 2) {
        newCritValue = lines[1].split(':')[1].trim();  // La segunda línea debe tener formato "key: value"
        console.log(newCritValue);
      }
      // Resolver la promesa con los valores
      resolve();
    };

    reader.onerror = function (e) {
      reject("Error al leer el archivo: " + e.target.error);  // Rechazar la promesa si hay un error
    };

    reader.readAsText(file);  // Iniciar la lectura del archivo
  });
}

//Funcion para ejecutar el patch a la api
async function payloadPatch() {
  let tasks = context.panel.elements.find(el => el.id === "tasks").value;
  //Guarda las tasks que haya en el read-only que es un array de tasks que tienen la misma measurement

  for (i = 0; i < tasks.length; i++) { //itera por todas las tasks
    const url = `http://localhost:9092/kapacitor/v1/tasks/${tasks[i]}`; //URL de la task indivdual
    const response = await fetch(url); // Cogemos los datos de la url
    const data = await response.json();
    //Buscamos los ooperadores por su id
    const oprW = context.panel.elements.find(el => el.id === "operatorWarn");
    const oprC = context.panel.elements.find(el => el.id === "operatorCrit");

    if (!response.ok) throw new Error(`Error en GET: ${response.status}`);
    // Si no hay valor de warn no escribe nada
    if (newWarnValue !== "") {
      //Si hay valor para warning y un operador actualiza el lambda.
      if (oprW && oprW.value !== "") {
        data.vars.warnlambda.value = `"value" ${oprW.value} ${newWarnValue}`;
        console.log(`"value" ${oprW} ${newWarnValue}`);
      }
      else { // SI hay valor para warning y no hay operador se pone por defecto >
        data.vars.warnlambda.value = `"value" > ${newWarnValue}`;
        console.log(`"value" > ${newWarnValue}`);
      }
    }
    if (newCritValue !== "") {// Realizamos las mismas comparaciones para critical que para warning 
      if (oprC && oprC.value !== "") {
        data.vars.critlambda.value = `"value" ${oprC.value} ${newCritValue}`;
        console.log(`"value" ${oprC} ${newCritValue}`);
      }
      else {
        data.vars.critlambda.value = `"value" > ${newCritValue}`;
        console.log(`"value" > ${newCritValue}`);
      }
    }
    const payload = { vars: data.vars };

    // Enviar PATCH
    const patchResponse = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload, null, 4)
    });

    if (!patchResponse.ok) throw new Error(`Error en PATCH: ${patchResponse.status}`);

    const result = await patchResponse.json();
    console.log(result); //mostramos el resultado por consola (F12)
    context.grafana.refresh(); //actualizamos el dashboard para ver si se ha realizado bien la actualizacion
  }
}

async function getTask() {
  try {
    const file = context.panel.elements.find(el => el.id === "yml").value[0];
    readFileAndParse(file)
      .then(() => {
        payloadPatch();
      });
    //uso then para asegurar que se ha leido primero el archivo antes de asignar los valores
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getTask();
