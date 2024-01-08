'use strict';

// to skip formating the next line
// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const message = document.querySelector('.message');
const messageText = message.querySelector('.message__text');
const messagebtn = message.querySelector('.message__btn');
const locationIcon = document.querySelector('.icon--location');
const btnShowAll = document.querySelector('.btn--show');
const btnDeleteAll = document.querySelector('.btn--delete');
const inputSort = document.querySelector('.sort');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // get last 10 chars numbers from the time stamp
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  // function in the parent called in the childs constructors that have type property. so, we don't write it twice
  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  // }
}
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.pace = duration / distance;
    this._setDescription();
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.speed = distance / duration;
    this._setDescription();
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = [];

  // NOTE any method called as callback func will be .bind(this) as this will be regular func call NOT a method call
  // EX at #getPosition method: we can't call loadMap as this.#loadmap as this will be called as regular func call NOT a method call (like this.#loadMap()) in the class which will set this to undefined
  constructor() {
    // Get user's position
    this.#getPosition(this.#loadMap);

    // Get data from user's storage
    this.#getLocalStorage();

    // Attach event handlers
    inputType.addEventListener('change', this.#togglaElevaionField); // no need for .bind(this) as no this in that method
    form.addEventListener('submit', this.#newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this.#getWorkout.bind(this));

    document.addEventListener('keydown', this.#hideFormKeyDown);
    locationIcon.addEventListener(
      'click',
      this.#getPosition.bind(this, this.#moveToCurrLocation)
    );
    btnShowAll.addEventListener('click', this.#showAllmarkers.bind(this));
    btnDeleteAll.addEventListener('click', this.#deleteAllWorkouts.bind(this));
    inputSort.addEventListener('change', this.#sortWorkouts.bind(this));
    messagebtn.addEventListener('click', this.#hideMessage);
  }

  #renderMessage(msg) {
    messageText.textContent = msg;
    message.classList.remove('hidden');
  }

  #hideMessage() {
    // message.style.display = 'none';
    message.classList.add('hidden');
    // setTimeout(() => (message.style.display = 'flex'), 1000);
  }

  #getPosition(func) {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        func.bind(this),
        this.#renderMessage.bind(
          this,
          '⛔ First allow the site to access your location.'
        )
      );
    else this.#renderMessage('❌ No geolocation in your browser!');
  }

  #loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    // map is the id of the div in html, 13 is the zoom level
    this.#map = L.map('map').setView(coords, 13);
    // When there is markers the view is near to last one instead of the cuurent coords
    //solution1: setview must be done after adding markers
    //solution2: remove focusing the map to the pinned marker after adding it by options

    // tiles style
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this)); // NOTE this event listener line can't be in the constructor as it's executed before this.#map takes a value

    this.#renderMessage('👇 Click on any location to add a new workout');

    // this.#workouts took value in the method that called after getPosition in getLocalStorage func which will be executed first as the current func is a callback after aysnc operation
    this.#workouts.forEach(workout => {
      this.#renderWorkoutMarker(workout); // can't be functoin() instead of arrow func as 'this' will undefined
    });

    // show all wokouts on map
    this.#workouts.length >= 1
      ? this.#showAllmarkers()
      : this.#map.setView(coords, 13);
  }

  #moveToCurrLocation(position) {
    if (!this.#map)
      return this.#renderMessage('⌛ Wait for loading the map...');

    const { latitude, longitude } = position.coords;
    this.#map.setView([latitude, longitude], 13, {
      animate: true,
      pin: {
        duration: 1,
      },
    });
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // hiding the form without transition animaiton
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #hideFormKeyDown(e) {
    if (e.key !== 'Escape') return;
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // hiding the form without transition animaiton
    form.classList.add('hidden');
  }

  #togglaElevaionField() {
    // closest is same like querySelector but search the parents instead of children
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    // make helper functions in the begining of the funcs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    let workout;

    // Create the workout obj
    if (inputType.value === 'running') {
      const cadence = +inputCadence.value;
      // Guard clause for validation: check for the opposite of what we interested in and if it's true then return immediately
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this.#renderMessage('🔴 Inputs have to be positive numbers!');

      workout = new Running(coords, distance, duration, cadence);
    } else {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return this.#renderMessage('🔴 Inputs have to be positive numbers!');

      workout = new Cycling(coords, distance, duration, elevation);
    }

    // Add the workout
    this.#workouts.push(workout);

    // Render marker
    this.#renderWorkoutMarker(workout);

    // Clear data and hide form
    this.#hideForm();

    // Render workout
    if (inputSort.value === 'date') this.#showWorkouts([workout]);
    else this.#sortWorkouts();

    // Store workouts in local storage
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      //.bindPopup('string') will add popup with default options
      // read Document for popup options to know what to change
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    this.#markers.push(marker);
  }

  // <button class="workout__delete">✖</button>
  #showWorkouts(workouts = this.#workouts) {
    let html;
    workouts.forEach(workout => {
      html = `
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
        <button class="workout__delete">
          ✖
          <div class="tooltip">Delete workout</div>
        </button>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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
      if (workout.type === 'running')
        html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
      else
        html += `        
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
      // form.insertAdjacentHTML('afterend', html);
      containerWorkouts.insertAdjacentHTML('afterbegin', html);
    });
  }

  #getWorkout(e) {
    // get the clicked element then get the closest parent whose class name is workout
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    // check for close or move
    if (e.target.className === 'workout__delete')
      this.#deleteWorkout(workoutEl);
    else this.#moveToPopup(workoutEl);

    // Can't use this parent public method (or any method in all prototype chain) when we have workouts objects from local storage after converting them from string as the prototype chain is gone
    // workout.click();
    // a solution for that is to recreate objects by data of the localstorage instead just converting
  }

  #moveToPopup(workoutEl) {
    // When we click on a workout before the map has loaded, we get an error
    if (!this.#map)
      return this.#renderMessage('⌛ Wait for loading the map...');

    const workout = this.#workouts.find(
      workout => workout.id == workoutEl.dataset.id // as we added the id in data-id in html element
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pin: {
        duration: 1,
      },
    });
  }

  #setLocalStorage() {
    // local storage is blocking so it's not good except for smoall data.
    // stores as key value and the 2 are strings
    // JSON.stringify transfer obj to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const workouts = localStorage.getItem('workouts');
    if (!workouts) return;

    this.#workouts = JSON.parse(workouts); // parse string as js code
    this.#showWorkouts();
    // Can't set pin points here. this must be done after this.#map take value in the asyncronous operation.
  }

  #deleteWorkout(workoutEl) {
    // Remove rendered html workout
    workoutEl.remove();

    // Get index
    const index = this.#workouts.findIndex(
      workout => workout.id === workoutEl.dataset.id
    );
    // Remove from arr
    this.#workouts.splice(index, 1);

    // remove marker
    this.#markers.splice(index, 1)[0].remove();

    // updated the local storage
    this.#setLocalStorage();
  }

  #deletRenderedWorkouts() {
    containerWorkouts.innerHTML = '';
    // containerWorkouts
    //   .querySelectorAll('.workout')
    //   .forEach(workoutEl => workoutEl.remove());
  }

  #deleteAllWorkouts() {
    // Delete workouts arr
    this.#workouts = [];

    // Update local storage
    localStorage.removeItem('workouts');

    // Delete markers
    this.#markers.forEach(marker => marker.remove());
    this.#markers = [];

    // Delete rendered html workouts
    this.#deletRenderedWorkouts();
  }

  #sortWorkouts() {
    if (inputSort.value !== 'distance' && inputSort.value !== 'duration') {
      this.#deletRenderedWorkouts();
      this.#showWorkouts();
      return;
    }
    const sorted = this.#workouts
      .slice()
      .sort(
        (workout1, workout2) =>
          workout1[inputSort.value] - workout2[inputSort.value]
      ); // ascending to be shown desc
    this.#deletRenderedWorkouts();
    this.#showWorkouts(sorted);
  }

  // #farestTwoPoints() {
  //   // Get the biggest distance bet 2 worktouts
  //   let distance;
  //   let max = 0;
  //   let indices = [];
  //   for (let i = 0; i < this.#workouts.length; i++)
  //     for (let j = i + 1; j < this.#workouts.length; j++) {
  //       distance = this.#map.distance(
  //         this.#workouts[i].coords,
  //         this.#workouts[j].coords
  //       );
  //       if (distance > max) {
  //         max = distance;
  //         indices = [i, j];
  //       }
  //     }
  //   return [this.#workouts[indices[0]], this.#workouts[indices[1]]];
  // }

  #showAllmarkers() {
    if (!this.#map)
      return this.#renderMessage('⌛ Wait for loading the map...');

    // check for 1 or 0 on map
    if (this.#workouts.length < 1)
      return this.#renderMessage('🔴 Use when there is at least 1 workout.');

    const allMarkers = this.#markers.map(m => m.getLatLng());
    const bounds = L.latLngBounds(allMarkers);
    this.#map.fitBounds(bounds, {
      maxZoom: 16,
      animate: true,
      pin: {
        duration: 1,
      },
    });

    // Fit the bounds of the 2 farest workouts
    // const [workout1, workout2] = this.#farestTwoPoints();
    // this.#map.fitBounds([workout1.coords, workout2.coords], {
    //   // maxZoom: 11,
    //   animate: true,
    //   pin: {
    //     duration: 1,
    //   },
    // });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
