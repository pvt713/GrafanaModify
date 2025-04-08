Table of Contents

[**Instalación Plugins** 1](#_Toc194667902)

[**Dashboard ChangeThresholdsDescIndv** 1](#_Toc194667903)

[Variable id 2](#_Toc194667904)

[Panel TaskVisualization 2](#_Toc194667905)

[Panel ModifyTask 2](#_Toc194667906)

[**Dashboard SideloadModify** 3](#_Toc194667907)

[Variable Measurement 3](#_Toc194667908)

[Panel TasksVisualization 3](#_Toc194667909)

[Panel SideloadTasks 3](#_Toc194667910)

## Instalación Plugins

Para poder aplicar el cambio de descripciones y thresholds en grafana son necesarios dos plugins. El primero es <https://grafana.com/docs/plugins/yesoreyeram-infinity-datasource/latest/> , para contectarse a una api que contenga un JSON para usarla de datasource, para conectarla no hace falta especificar nada porque puedes definir la url en cada query pero yo establezco en el apartado URL, headers & params, en la parde de Base URL la url donde tengo almacenadas las tasks en kapacitor (http://172.18.0.2:9092/ /kapacitor/v1/tasks). Y después el plugin <https://grafana.com/grafana/plugins/volkovlabs-form-panel/> para poder realizar cambios y usar métodos como patch desde grafana. Ambos los añado ejecutando un comando desde consola en el contenedor donde teno grafana y ejecuto ***docker exec -it grafana\_beca grafana-cli plugins install yesoreyeram-infinity-datasource*** y ***docker exec -it grafana\_beca*** ***grafana-cli plugins install volkovlabs-form-panel*** respectivamente.

## Dashboard ChangeThresholdsDescIndv

Primero creo un dashboard para **modificar la descripción y thresholds de tareas por separado.**

### Variable id

Creo una dashboard variable con una **query sobre la api de kapacitor**. Como ya hemos definido la API de kapacitor como url base no hace falta poner url ahora, vamos al apartado de Parsing options & result fields y definimos en el apartado de root escribimos tasks como nuestra root y añadimos una columna que en el selector sea id y en el label igual y definimos la variable como “Id”.

### Panel TaskVisualization

Creo un panel con forma de tabla que usara una query sobre el datasource creado en la api JSON y vuelvo a **hacer lo mismo que con la dashboard variable** pero añado como columnas la descripción, critlambda y warnlambda, todos estos valores están definidos dentro de **cada task en vars.<su nombre>.value**, por lo que así los definimos. Este panel serviría de referencia para ver las actualizaciones.

### Panel ModifyTask

Ahora creo un panel business forms y creo una query como la anterior, **añado** en la parte de Computed columns filter & group by un filter que sea : **<label al id> == $”Id”** así hacemos que el id de la query sea el id de la dashboard variable. Luego en business forms creamos dos secciones una con los datos para ver tanto la descripción como los lambdas y algún otro que nos sirva para realizar las modificaciones, y otra sección para introducir los cambios. En la **primera sección** creamos elements de tipo read-only y creamos uno para cada campo que podamos cambiar por ejemplo description, warnlambda y critlambda y en las opciones de panel en initial request seleccionamos query y asignamos los valores iniciales de cada element a los valores que devuelve la query.

**En la sección de modificación** añado un string input para la descripción con su valor inicial a la descripción de la query, dos select from custom options para elegir el operador de cada lambda (warn y crit) y dos number inputs para los lambda respectivos.

Luego para el **patch** ejecutamos por código javascript, ([código de ModifyTask](https://github.com/pvt713/GrafanaModify/blob/main/ModifyTask.js))que se ejecutara al hacer click en submit. En este código recojo el json de la task que esta seleccionada (guardado en data), mediante un get. Luego recojo lo que tengo guardado en en los elements de la nueva sección buscando por su id. Actualizo los valores de data, por ejemplo de la description, como data.vars.description.value = newDescriptionElement.value (.value devuelve el valor que hemos escrito) habiendo comprobado antes que existe, luego para los lambdas compruebo que el operador no esta vacio y que existe el element que almacena su valor numérico antes de actualizarlo, después hago un patch de este data modificado a la url de la task seleccionada y actualizo el dashboard para mostrar los cambios.

## Dashboard SideloadModify

Para realizar algo parecido a un sideload, cargar los thresholds desde un archivo .yml o .yaml, hago algo similar. Primero creo un dashboard nuevo y una dashboard variable

### Variable Measurement

Creo una variable de dashboard que sea el elemento que va a agrupar las tasks para modificar los thresholds del grupo. Yo he usado el measurement de la task pero se puede usar el host o cualquier otra cosa.

### Panel TasksVisualization

Es casi igual que [TaskVisualization](#_Panel_TaskVisualization) pero añado la columna que realiza la agrupación, en este caso la columna measurement, y muestro las demás (id, critlambda, warnlamda y description) haciendo la selección igual que en TaskVisualization.

### Panel SideloadTasks

Este panel es business forms igual que ModifyTasks. Ponemos initial request también a query.

La query la hago igual solo seleccionando los ids y la variable que usemos para agrupar en el dashboard y añadimos un filtro que el **label** de esta **sea igual** al de **la dashboard variable,** además, añado dos transformaciones primero un group by en id uso calculate y pongo all values luego hago un reduce fields en all values así todas las tasks que haya van a estar en una fila en un array. Ese array lo vinculo a un element read only y creo un element para añadir un archivo .yml o .yaml y dos select from custom values para los operadores ya que el .yml solo tendrá el valor numérico del threshold. Y para realizar el patch hago un código similar ([código de SideloadTasks](https://github.com/pvt713/GrafanaModify/blob/main/SideloadTasks.js)) pero **itero sobre el array de tasks y cambio la url para cada task individual**. Además hago una funcion para la lectura del archivo .yml que almacena en dos variables los valores numéricos dividiendo las líneas , **la primera linea es para warning y la segunda para critical** y compruebo si hay 0 lineas lanzo un error si hay 1 linea solo guardo el valor para warning y si hay 2 guardo ambos, también compruebo si hay operadores y si no hay dejo por defeco el >.
