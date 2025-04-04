const url = "http://localhost:9092/kapacitor/v1/tasks/$Id";
//Con $Id hago referencia a la variable del dashboard

async function getTask() {
  try {
    const response = await fetch(url); //Get del json de la task
    if (!response.ok) throw new Error(`Error en GET: ${response.status}`);

    const data = await response.json();
    //Buscamos todos los elementos por su id
    const newDescriptionElement = context.panel.elements.find(el => el.id === "newDescription");
    const newWarnElement = context.panel.elements.find(el => el.id === "newWarn");
    const newCritElement = context.panel.elements.find(el => el.id === "newCrit");
    const oprW = context.panel.elements.find(el => el.id === "operatorWarn");
    const oprC = context.panel.elements.find(el => el.id === "operatorCrit");

    if (!newDescriptionElement) {
      throw new Error("Elemento con id 'newDescription' no encontrado en context.panel.elements");
    }

    data.vars.description.value = newDescriptionElement.value;

    // Solo asignar warningLambda si oprW no está vacío
    if (oprW && oprW.value !== "" && newWarnElement) {
      data.vars.warnlambda.value = `"value" ${oprW.value} ${newWarnElement.value}`;
    }

    // Solo asignar criticalLambda si oprC no está vacío
    if (oprC && oprC.value !== "" && newCritElement) {
      data.vars.critlambda.value = `"value" ${oprC.value} ${newCritElement.value}`;
    }

    const payload = { vars: data.vars };//actualizar valores

    // Enviar PATCH
    const patchResponse = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload, null, 4)
    });

    if (!patchResponse.ok) throw new Error(`Error en PATCH: ${patchResponse.status}`);

    const result = await patchResponse.json();
    console.log(result);
    context.grafana.refresh(); //Actualizar el Dashboard

  } catch (error) {
    console.error("Error:", error.message);
  }
}

getTask();