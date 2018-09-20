//html object
var restartButton = document.getElementById("restartButton");
var infoPasses = document.getElementById("passes");
var infoLife = document.getElementById("heart");
var infoBanana = document.getElementById("banana");
var infoGameOver = document.getElementById("gameOver");
var infoPause = document.getElementById("pause");
var blocker = document.getElementById("blocker");
var container = document.getElementById("container");

//system variables
var sceneWidth, sceneHeight, camera, scene, renderer, id;

//plane, models and parts of monkey
var plane, planeCopy, texture;
var modelVector = [];
var monkey = null, heart = null, rock = null, bomb = null, banana = null;
var head, tail, trunk, righthand, lefthand, righthear, lefthear, rightfoot, leftfoot;
var MONKEY_LOADED = false;
var HEART_LOADED = false;
var ROCK_LOADED = false;
var BOMB_LOADED = false;
var BANANA_LOADED = false;

//var for manage the monkey model
var monkeyMove = 0.6;
var monkeyJump = 1.5;
var jumping = true;
var invulnerable = false;
var left = true;
var right = true;

//var for manage the others models
var randomNumber;
var freqApp = 20;
var obstaclesMove = 0.5;
var obstacles;
var numObstacles = 30;
var initObstacles = 0;

//distances for the movements
var base = 1.5;
var leftLane = -2.5;
var rightLane = 2.5;
var currentLane = new THREE.Vector3(0.0, 0.0, -6.0);
var distanceZ, distanceX;

//game variables
var game_over = false;
var stop = false;
var passes = -1;
var startCount = 0;
var countLifes = 5;
var countBananas = 0;
var songTheme;

//get the pointer lock and start listening for if its state changes
function getPointerLock() {
    document.onclick = function () {
        container.requestPointerLock();
    }
    document.addEventListener('pointerlockchange', lockChange, false);
}

//switch the controls on or off
function lockChange() {
    // Turn on controls
    if(document.pointerLockElement === container) {
        blocker.style.display = "none";
        // Turn off the controls
    }
}

getPointerLock();
init();

function init() {
    createScene();
    addIcon();
    addModel();
    songTheme.play();
    setTimeout(render, 3000); //start the render with a little delay to allow the models to be loaded
}

function createScene(){
    sceneWidth = window.innerWidth;
    sceneHeight = window.innerHeight;
    scene = new THREE.Scene();//the 3d scene
    window.addEventListener('resize', onWindowResize, false);//resize callback

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.z = 0;
    camera.position.y = 2;

    //initialize the sun to have a light source
    sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set( 0,4,1 );
    sun.castShadow = true;
    scene.add(sun);

    //set up shadow properties for the sun light
    sun.shadow.mapSize.width = 256;
    sun.shadow.mapSize.height = 256;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;

    //set the keyboard
    document.onkeydown = handleKeyDown;

    //set the theme song
    songTheme = new sound("song/theme.mp3");

    //add initial plan and theirs clones to the scene
    texture = THREE.ImageUtils.loadTexture('./images/road.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.repeat.set(1, 1000);
    var geo = new THREE.PlaneBufferGeometry(10, 20000, 1, 1);
    var mat = new THREE.MeshBasicMaterial({map:texture, side : THREE.DoubleSide, color: 0xffffff});
    plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = (Math.PI/2);
    plane.position.z = -500;
    plane.receiveShadow = true;
    scene.add(plane);

    planeCopy = plane.clone();
    planeCopy.position.z = -1500;
    scene.add(planeCopy);

    //initialize the render
    renderer = new THREE.WebGLRenderer({alpha:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;
}

function sound(source) {
    this.sound = document.createElement("audio");
    this.sound.src = source;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){ this.sound.play(); }
    this.stop = function(){ this.sound.pause();
                            this.sound.currentTime = 0; }
    this.speedUp = function(){ this.sound.playbackRate= 3; }
    this.pause = function () { this.sound.pause(); }
}

function loadSound(name, time){
    name.play();
    setTimeout(function(){ name.stop(); }, time);
}

//in this function I load two .png images of a heart and a banana that I will need to contain the respective counters within the game
function addIcon() {
    var textureHeart = new THREE.TextureLoader().load('images/heart.png');
    textureHeart.minFilter = THREE.NearestFilter;
    var iconHeart = new THREE.CircleGeometry( 0.5, 32 );
    var materialHeart = new THREE.MeshBasicMaterial( { map:textureHeart} );
    var lifeHeart = new THREE.Mesh( iconHeart, materialHeart );
    lifeHeart.name = "Heart";
    lifeHeart.position.z = -20;
    lifeHeart.position.y = 8.5;
    lifeHeart.position.x = 16;
    lifeHeart.scale.x = lifeHeart.scale.y = lifeHeart.scale.z = 2.5;

    var textureBanana = new THREE.TextureLoader().load('images/banana.png');
    textureBanana.minFilter = THREE.NearestFilter;
    var iconBanana = new THREE.CircleGeometry( 0.5, 32 );
    var materialBanana = new THREE.MeshBasicMaterial( { map:textureBanana} );
    var bananaCount = new THREE.Mesh( iconBanana, materialBanana );
    bananaCount.name = "Banana";
    bananaCount.position.z = -20;
    bananaCount.position.y = 5.95;
    bananaCount.position.x = 16;
    bananaCount.scale.x = bananaCount.scale.y = bananaCount.scale.z = 3;

    scene.add(lifeHeart);
    scene.add(bananaCount);
}

//manage the rotation of the plane so that before the plane disappears (on the z axis) I add its clone that does the same thing
function addPlane(){
    if(plane.position.z != 500) { //scrolling the plane towards the screen
        plane.position.z += obstaclesMove; //the speed of sliding follows that of the obstacles making in world that increasing the difficulty also this increases
    } else
        plane.position.z = -1500; //bring back the plane

    if(planeCopy.position.z != 500) { //scrolling the plane towards the screen
        planeCopy.position.z += obstaclesMove;
    } else
        planeCopy.position.z = -1500; //bring back the plane
}

function addMonkey(){
    var loader = new THREE.ObjectLoader();
    loader.load("models/monkey.json",
        function(obj){
            monkey = obj;
            MONKEY_LOADED = true;
            monkey.position.x = 0;
            monkey.position.y = 0;
            monkey.position.z = -5.5;
            monkey.scale.x = 10;
            monkey.scale.y = monkey.scale.z = 9;
            monkey.is_ob = true;

            scene.add(obj);

            //declare the components of my monkey model
            head = scene.getObjectByName('geo_CABEZA_MONO');
            tail = scene.getObjectByName('geo_COLA_MONO');
            trunk = scene.getObjectByName('geo_CUERPO_MONO');
            righthand = scene.getObjectByName('geo_MANO_DER_MONO');
            lefthand = scene.getObjectByName('geo_MANO_IZQ_MONO');
            righthear = scene.getObjectByName('geo_OREJA_DER_MONO');
            lefthear = scene.getObjectByName('geo_OREJA_IZQ_MONO');
            rightfoot = scene.getObjectByName('geo_PIE_DER_MONO');
            leftfoot = scene.getObjectByName('geo_PIE_IZQ_MONO');

            //manage the position of the tail to avoid that during the movement it gives the impression of detaching from the body
            tail.position.z = -0.1;
            tail.position.y = 0.4; },

        function(xhr){ console.log((xhr.loaded/xhr.total*100) + '%loaded'); },

        function(err){ MONKEY_LOADED = false; console.error('Error'); }
    );
}

function addHeart(){
    var loader = new THREE.ObjectLoader();
    loader.load("models/heart.json",
        function(obj){
            heart = obj;
            HEART_LOADED = true;
            heart.position.x = 0;
            heart.position.y = 0.6;
            heart.position.z = 1;
            heart.scale.x = heart.scale.y = heart.scale.z = 0.0065; },

        function(xhr){ console.log((xhr.loaded/xhr.total*100) + '%loaded'); },

        function(err){ HEART_LOADED = false; console.error('Error'); }
    );
}

function addBanana(){
    var loader = new THREE.ObjectLoader();
    loader.load("models/banana.json",
        function(obj){
            banana = obj;
            BANANA_LOADED = true;
            banana.position.x = 0;
            banana.position.y = 0.4;
            banana.position.z = 1;
            banana.rotation.z = +180;
            banana.scale.x = banana.scale.y = banana.scale.z = 0.0055; },

        function(xhr){ console.log((xhr.loaded/xhr.total*100) + '%loaded'); },

        function(err){ BANANA_LOADED = false; console.error('Error'); }
    );
}

function addRock(){
    var loader = new THREE.ObjectLoader();
    loader.load("models/rock.json",
        function(obj){
            rock = obj;
            ROCK_LOADED = true;
            rock.position.x = 0;
            rock.position.y = 0.25;
            rock.position.z = 1;
            rock.scale.x = rock.scale.y = rock.scale.z = 0.44; },

        function(xhr){ console.log((xhr.loaded/xhr.total*100) + '%loaded'); },

        function(err){ ROCK_LOADED = false; console.error('Error'); }
    );
}

function addBomb(){
    var loader = new THREE.ObjectLoader();
    loader.load("models/bomb.json",
        function(obj){
            bomb = obj;
            BOMB_LOADED = true;
            bomb.position.x = 0;
            bomb.position.y = 0.35;
            bomb.position.z = 1.0;
            bomb.scale.x = bomb.scale.y = bomb.scale.z = 0.7; },

        function(xhr){ console.log((xhr.loaded/xhr.total*100) + '%loaded'); },

        function(err){ BOMB_LOADED = false; console.error('Error'); }
    );
}

function addModel(){
   addMonkey();
   addHeart();
   addBanana();
   addRock();
   addBomb();
}

//set the options for the buttons of keyboard that I use for the game
function handleKeyDown(keyEvent) {
    var validMove = true;

    if(keyEvent.keyCode === 37) { //37: <-- (left)
        if(currentLane.x > leftLane && left == true) {
            monkey.position.x -= monkeyMove;
            currentLane.setX(monkey.position.x);

            //the monkey moves its tail up and down during the movement and rotates its feet
            rightfoot.rotation.z += -1 / 12 * Math.PI;
            rightfoot.rotation.x += -1 / 90 * Math.PI;
            rightfoot.rotation.y += -1 / 18 * Math.PI;

            leftfoot.rotation.z += -1 / 90 * Math.PI;
            leftfoot.rotation.x += -1 / 90 * Math.PI;
            leftfoot.rotation.y += -1 / 18 * Math.PI;

            tail.rotation.x += -1 / 6 * Math.PI;

            setTimeout(reposition, 300);

        } else { validMove = false; }

    } else if(keyEvent.keyCode === 39 && right == true) { //39: --> (right)
        if(currentLane.x < rightLane) {
            monkey.position.x += monkeyMove;
            currentLane.setX(monkey.position.x);

            rightfoot.rotation.z += -1 / 12 * Math.PI;
            rightfoot.rotation.x += -1 / 90 * Math.PI;
            rightfoot.rotation.y += -1 / 18 * Math.PI;

            leftfoot.rotation.z += -1 / 90 * Math.PI;
            leftfoot.rotation.x += -1 / 90 * Math.PI;
            leftfoot.rotation.y += -1 / 18 * Math.PI;

            tail.rotation.x += -1 / 6 * Math.PI;

            setTimeout(reposition, 300);

        } else {  validMove = false; }

    } else if(keyEvent.keyCode === 38) { //38: jump (up)
        if(currentLane.y < base && jumping == true) {
            monkey.position.y += monkeyJump;
            currentLane.setY(monkey.position.y);

            //If the jump is successful, the monkey cannot be hit and cannot move left or right during the flight phase.
            left = false;
            right = false;
            jumping = false;
            invulnerable = true;

            rightfoot.rotation.z += -1 / 12 * Math.PI;
            rightfoot.rotation.x += -1 / 90 * Math.PI;
            rightfoot.rotation.y += -1 / 18 * Math.PI;

            leftfoot.rotation.z += -1 / 90 * Math.PI;
            leftfoot.rotation.x += -1 / 90 * Math.PI;
            leftfoot.rotation.y += -1 / 18 * Math.PI;

            tail.rotation.x += -1 / 6 * Math.PI;

            setTimeout(downJump, 400); //duration of the jump before returning to the ground
            setTimeout(stopJump, 1200); //time required for a new jump to be made

        } else { validMove = false; }

    } else if(keyEvent.keyCode === 32) { //32: Pause (space button)
        if(game_over == false) {
            if (stop == false) { //the game is paused by blocking the render, the step count, the music and making the label with the words "PAUSE" appear
                stop = true;
                cancelAnimationFrame(id);
                songTheme.pause();
                stopCounter();
                infoPause.style.visibility = 'visible';

            } else { //restarts the game
                stop = false;
                infoPause.style.visibility = 'hidden';
                requestAnimationFrame(render);
                songTheme.play();
                startCounter();
            }
        }

    } else if(keyEvent.keyCode === 82) { window.location.reload(); } //82: New Game (R)

    else return;
}

//resets all variables for the monkey to return to the ground
function downJump(){
    monkey.position.y -= monkeyJump;
    currentLane.setY(monkey.position.y);
    reposition();
    left = true;
    right = true;
    invulnerable = false;
}

//function that inhibits jumping
function stopJump(){
    jumping = true;
}

//reset the initial position of thing and feet after their movement
function reposition(){
    rightfoot.rotation.z += 1/12*Math.PI;
    rightfoot.rotation.x += 1/90*Math.PI;
    rightfoot.rotation.y += 1/18*Math.PI;

    leftfoot.rotation.z += 1/90*Math.PI;
    leftfoot.rotation.x += 1/90*Math.PI;
    leftfoot.rotation.y += 1/18*Math.PI;

    tail.rotation.x += 1/6*Math.PI;
}

//generate a random number between 1 and 100 to manage the distribution of loading of the various models on the plane:
// a number between 1 and 65 corresponds to the rock, between 66 and 80 to the bomb, between 81 and 98 to the banana
// and finally between 99 and 100 for the heart
function chooseModelToLoad(){
    randomNumber = Math.floor(Math.random()*(100-1+1)+1);
    if(randomNumber >= 1 && randomNumber <=65){
        var app = rock.clone();
        app.code = 0; //save the code of objects
    } else if(randomNumber >= 66 && randomNumber <=80){
        var app = bomb.clone();
        app.code = 1;
    } else if(randomNumber >= 81 && randomNumber <=98){
        var app = banana.clone();
        app.code = 2;
    } else {
        var app = heart.clone();
        app.code = 3;
    }
    return app;
}

//by means of a vector, add on the scene, in the various possible positions, the various obstacles
function setModel(obj){
        if(modelVector.length < 1){
            obj.position.x = Math.floor(Math.random()*((1.6) - (-1.6) + 1) + (-1.6));
            obj.position.z = Math.floor(Math.random()*((-300) - (-50) + 1) + (-50));
        } else{
            obj.position.x = Math.floor(Math.random()*((1.6) - (-1.6) + 1) + (-1.6));
            obj.position.z = modelVector[modelVector.length-1].position.z - freqApp;
        }
        scene.add(obj);
}

//here according to the code I add on the carrier of the models one of my models: rock, bomb, banana or heart
function loadModel(){
    var app1 = rock.clone();
    app1.code = 0;
    setModel(app1);
    modelVector.push(app1);

    var app2 = bomb.clone();
    app2.code = 1;
    setModel(app2);
    modelVector.push(app2);

    var app3 = banana.clone();
    app3.code = 2;
    setModel(app3);
    modelVector.push(app3);

    var app4 = heart.clone();
    app4.code = 3;
    setModel(app4);
    modelVector.push(app4);

    for(initObstacles; initObstacles < numObstacles; initObstacles += 1){
        app = chooseModelToLoad();
        setModel(app);
        //charge the model on the array
        modelVector.push(app);
    }
}

//this is the function where collisions are detected, or rather where the minimum distance between the monkey and the various objects (on the y and z axis) is calculated,
//so that the "impact" function is called, where a certain action will take place on the basis of the object code.
function obstacleManagement(){
    for(var i = 0; i < modelVector.length; i++){

        obstacles = modelVector[i];
        obstacles.position.z += obstaclesMove;
        // reports the position z of the obstacle at the end of the plane when it is too close
        if(obstacles.position.z > 0){
            obstacles.position.z = modelVector[modelVector.length - 1].position.z - freqApp + obstaclesMove;
            obstacles.position.x = Math.floor(Math.random() * ((1.6) - (-1.6) + 1) + (-1.6));
            //remove first element and then push it in last position
            modelVector.shift();
            modelVector.push(obstacles);
        }

        if(MONKEY_LOADED == true){
            distanceZ = obstacles.position.z - obstaclesMove; //min distance on z axe
            distanceX = obstacles.position.x - monkey.position.x; //min distance on x axe

            //for the model of the bomb I manage manually the position of impact because of the specifications of the model itself which is different from the others
            if((obstacles.code == 1) && (distanceZ >= monkey.position.z) &&
                ((distanceX == 0.9999999999999998) || (distanceX == 1) || (distanceX == 1.1999999999999997) ||
                (distanceX == 1.2) || (distanceX == 1.4) || (distanceX == 1.5999999999999996) ||
                (distanceX == 1.6) || (distanceX == 1.7999999999999998) || (distanceX == 2)) && (invulnerable == false)){
                obstacles.position.x = 2000; //remove the object from the plane by simply modifying its x and removing it from the chamber, thus simulating the actual impact with the monkey
                impact(obstacles.code);

            } else {
                distanceX = Math.abs(distanceX);
                //work on collision of other models which is at standard distances from the bomb handled in the previous if
                if(obstacles.code != 1 && distanceZ >= monkey.position.z && distanceX <= 1 && invulnerable == false){
                    obstacles.position.x = 2000;
                    impact(obstacles.code);
                }
            }
        }
    }
}

//using a simple switch I manage the impact with each of the models:
//0) when I take a rock I lose a life,
//1) if I hit a bomb I lose two,
//2) if I take a banana I update a counter that every time I pick up 10 bananas gives me back a life,
//3) finally if I take a heart I will get an extra life
function impact(code){
        switch(code){
            case 0:
                //rock
                countLifes -= 1;
                infoLife.innerHTML = countLifes;
                break;

            case 1:
                //bomb
                countLifes -= 2;
                infoLife.innerHTML = countLifes;
                break;

            case 2:
                //banana
                countBananas += 1;
                if(countBananas % 10 == 0){
                    countLifes += 1;
                    infoLife.innerHTML = countLifes;
                }
                infoBanana.innerHTML = countBananas;
                break;

            case 3:
                //heart
                countLifes += 1;
                infoLife.innerHTML = countLifes;
                break;

        }
    }

//represents the function that manages the end of the game, it occurs of course when I lose all my lives,
//stops the passes count, the music, makes the words "Game Over" appear with the restart button,
//that if you press it reinitializes the page for a new game
function gameOver(){
    songTheme.stop();
    restartButton.style.visibility = 'visible';
    infoGameOver.style.visibility = 'visible';
    stopCounter();
    cancelAnimationFrame(id);
    restartButton.onclick = function(){window.location.reload();};
}

//along with the two following functions allows me to manage a simple counter that will allow me to see in real time the progress of the game
function countPasses() {
    if(startCount == 1){
        passes +=1;
        infoPasses.innerHTML = passes + ' meters';
        setTimeout(countPasses, 1000);
    }
}
function startCounter(){ startCount = 1; countPasses(); }
function stopCounter(){ startCount = 0; }

//represents the increase in difficulty: every 50 meters the plane and the objects on it will move faster
function increaseMove(){ obstaclesMove = obstaclesMove + 0.005; }

//resize & align
function onWindowResize(){
    sceneHeight = window.innerHeight;
    sceneWidth = window.innerWidth;
    renderer.setSize(sceneWidth, sceneHeight);
    camera.aspect = sceneWidth/sceneHeight;
    camera.updateProjectionMatrix();
}

function render(){

    //if all the models have been loaded, I add them to the scene and start the passes count
    if(ROCK_LOADED == true && BOMB_LOADED == true &&
        BANANA_LOADED == true && HEART_LOADED == true){
        loadModel();
        ROCK_LOADED = false;
        BOMB_LOADED = false;
        BANANA_LOADED = false;
        HEART_LOADED = false;
        startCounter();
    }

    //after the 49th every 50 meters increases the speed by calling the function increaseMove
    if(passes % 50 == 0 && passes > 49){
        increaseMove();
    }

    //manages the call to the gameOver function
    if(countLifes <= 0){
        gameOver();
        game_over = true;
    }

    addPlane();
    obstacleManagement();
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);//draw

    //until game over is detected the render works
    if(game_over == false){ id = requestAnimationFrame(render); }
}
