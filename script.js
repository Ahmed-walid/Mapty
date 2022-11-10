"use strict";

// DATA
class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // mins
  }

  // this function will be inheirted by the children (in case you are worry about 'this.type')
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.discription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // mins / km
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.duration / (this.distance / 60);
    return this.speed;
  }
}

////////////////////////

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

// APPLICATION
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkOut.bind(this));

    inputType.addEventListener("change", this._toggleElevationField.bind(this));

    // we delegate clicks on workout item to this element.
    containerWorkouts.addEventListener('click',this._moveToPopUp.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert(`Could not get your location`);
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(`https://www.google.com/maps/@${latitude},${longitude},13z`);

    // L is a namespace which contains all function we need.
    this.#map = L.map("map").setView(coords, this.#zoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showFrom.bind(this));

    // render workouts on the map once loaded in case there were workouts stored locally by _getLocalStorage() called in the App constructor.
    // this should be refactored by using async js.
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showFrom(clickEvent) {
    form.classList.remove("hidden");
    inputDistance.focus();
    this.#mapEvent = clickEvent;
  }

  _hideForm(){

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(()=> form.style.display = 'grid',1000);
    

    inputCadence.value =
    inputDistance.value =
    inputDuration.value =
    inputElevation.value =
      "";
  }

  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkOut(e) {
    e.preventDefault();

    //helper funcitons:
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    // create new running object if workout was running
    if (type === "running") {
      // check if data is valid
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("All inputs should be positive numbers");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // create new cycling object if workout was cycling
    if (type === "cycling") {
      // check if data is valid
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(
          "All inputs should be positive numbers except elevation may be a negative number"
        );

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add the new object to the workout array
    this.#workouts.push(workout);

    // add the workout to the map
    this._renderWorkoutMarker(workout);

    // add the workout to the list
    this._renderWorkout(workout);

    // clear the input fields and hide the form
    this._hideForm()

    // set local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.constructor.name.toLowerCase()}-popup`,
        })
      )
      .openPopup()
      .setPopupContent(`${ workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}${workout.discription}`);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.discription}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;

    if (workout.type === "running")
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence.toFixed(1)}</span>
            <span class="workout__unit">spm</span>
          </div>
          `;
    else
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain.toFixed(1)}</span>
          <span class="workout__unit">m</span>
        </div>
        `;
      
    form.insertAdjacentHTML('afterend', html)
  }

  _moveToPopUp(e){

    const workoutEl = e.target.closest('.workout');

    // if the click was on non-workout item area.
    if(!workoutEl) return;

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

    this.#map.setView(workout.coords,this.#zoomLevel,{
      animate:true,
      pan:{
        duration:1,
      },
    });

  }

  _setLocalStorage(){
    localStorage.setItem('workouts',JSON.stringify(this.#workouts));
  }

  _getLocalStorage(){

    // This not 100% correct; 
    const data = JSON.parse(localStorage.getItem('workouts'));

    if(!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset(){
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
