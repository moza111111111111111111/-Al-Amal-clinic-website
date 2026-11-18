const services = [
  { id: "gp", name: "General consultation", minutes: 20, description: "Colds, infections, aches, and anything you are unsure about." },
  { id: "chk", name: "Health check-up", minutes: 40, description: "Blood pressure, blood tests and a plan for the year ahead." },
  { id: "kid", name: "Children’s clinic", minutes: 30, description: "Illness visits, growth checks and vaccinations." },
  { id: "wom", name: "Women’s health", minutes: 30, description: "Screening, contraception and pregnancy care." },
  { id: "chr", name: "Chronic care review", minutes: 30, description: "Diabetes, asthma and blood pressure follow-ups." }
];

const doctors = [
  { id: "d1", name: "Dr. Khalid Al Balushi", role: "Family medicine", serviceIds: ["gp", "chk", "chr"] },
  { id: "d2", name: "Dr. Salim Al Busaidi", role: "Paediatrics", serviceIds: ["kid", "gp"] },
  { id: "d3", name: "Dr. Maryam Al Harthy", role: "Women’s health", serviceIds: ["wom", "gp", "chk"] }
];

const openingHour = 9;
const closingHour = 17;
const lunchHour = 13;
const closedWeekday = 5;
const daysToShow = 10;
const storageKey = "clinic.appointments";

const bookingForm = document.getElementById("booking-form");
const serviceSelect = document.getElementById("service-select");
const doctorSelect = document.getElementById("doctor-select");
const dayList = document.getElementById("day-list");
const slotList = document.getElementById("slot-list");
const nameInput = document.getElementById("name-input");
const phoneInput = document.getElementById("phone-input");
const formError = document.getElementById("form-error");

const confirmation = document.getElementById("confirmation");
const confirmationTitle = document.getElementById("confirmation-title");
const confirmationDetails = document.getElementById("confirmation-details");
const bookAgainBtn = document.getElementById("book-again-btn");

const servicesList = document.getElementById("services-list");
const doctorsList = document.getElementById("doctors-list");
const appointmentsList = document.getElementById("appointments-list");

let selectedDate = "";
let selectedTime = "";
let appointments = [];

const loadAppointments = () => {
  try {
    appointments = JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch (error) {
    appointments = [];
  }
};

const saveAppointments = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(appointments));
  } catch (error) {

  }
};

const escapeHtml = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const toIsoDate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const formatTime = (time) => {
  const [hour, minutes] = time.split(":");
  const hourNumber = Number(hour);
  const hour12 = hourNumber > 12 ? hourNumber - 12 : hourNumber;
  const period = hourNumber >= 12 ? "pm" : "am";
  return `${hour12}:${minutes} ${period}`;
};

const formatDate = (isoDate) => {
  const [year, month, day] = isoDate.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
};

const hashText = (text) => {
  let hash = 0;
  for (const character of text) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
};

const findById = (list, id) => list.find((item) => item.id === id);

const getOpenDays = () => {
  const days = [];
  const day = new Date();
  day.setHours(0, 0, 0, 0);

  while (days.length < daysToShow) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() !== closedWeekday) {
      days.push(new Date(day));
    }
  }
  return days;
};

const getTimeSlots = () => {
  const slots = [];
  for (let hour = openingHour; hour < closingHour; hour++) {
    if (hour === lunchHour) continue;
    slots.push(`${hour}:00`);
    slots.push(`${hour}:30`);
  }
  return slots;
};

const isSlotTaken = (doctorId, date, time) => {
  const bookedByVisitor = appointments.some((appointment) => {
    return (
      appointment.doctorId === doctorId &&
      appointment.date === date &&
      appointment.time === time
    );
  });

  const fakeTaken = hashText(doctorId + date + time) % 4 === 0;

  return bookedByVisitor || fakeTaken;
};

const showServiceOptions = () => {
  serviceSelect.innerHTML = services
    .map((service) => {
      return `<option value="${service.id}">${service.name} (${service.minutes} min)</option>`;
    })
    .join("");
};

const showDoctorOptions = () => {
  const availableDoctors = doctors.filter((doctor) => {
    return doctor.serviceIds.includes(serviceSelect.value);
  });

  doctorSelect.innerHTML = availableDoctors
    .map((doctor) => {
      return `<option value="${doctor.id}">${doctor.name}, ${doctor.role}</option>`;
    })
    .join("");
};

const showDays = () => {
  dayList.innerHTML = getOpenDays()
    .map((day) => {
      const isoDate = toIsoDate(day);
      const weekday = day.toLocaleDateString(undefined, { weekday: "short" });
      const month = day.toLocaleDateString(undefined, { month: "short" });
      const isSelected = isoDate === selectedDate;

      return `
        <button type="button" class="choice day" data-date="${isoDate}" aria-pressed="${isSelected}">
          <small>${weekday}</small>
          <strong>${day.getDate()}</strong>
          <small>${month}</small>
        </button>`;
    })
    .join("");

  dayList.querySelectorAll(".day").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDate = button.dataset.date;
      selectedTime = "";
      showDays();
      showTimes();
    });
  });
};

const showTimes = () => {
  if (selectedDate === "") {
    slotList.innerHTML = `<p class="hint">Choose a day to see open times.</p>`;
    return;
  }

  slotList.innerHTML = getTimeSlots()
    .map((time) => {
      const taken = isSlotTaken(doctorSelect.value, selectedDate, time);
      const isSelected = time === selectedTime;

      return `
        <button type="button" class="choice slot" data-time="${time}"
          aria-pressed="${isSelected}" ${taken ? "disabled" : ""}>
          ${formatTime(time)}
        </button>`;
    })
    .join("");

  slotList.querySelectorAll(".slot").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTime = button.dataset.time;
      showTimes();
    });
  });
};

const showServicesAndDoctors = () => {
  servicesList.innerHTML = services
    .map((service) => {
      return `
        <div class="card">
          <h3>${service.name}</h3>
          <p>${service.description}</p>
        </div>`;
    })
    .join("");

  doctorsList.innerHTML = doctors
    .map((doctor) => {

      const nameWords = doctor.name.replace("Dr. ", "").split(" ");
      const initials = nameWords[0][0] + nameWords[nameWords.length - 1][0];

      return `
        <div class="card card-doctor">
          <div class="avatar" aria-hidden="true">${initials}</div>
          <div>
            <h3>${doctor.name}</h3>
            <p>${doctor.role}</p>
          </div>
        </div>`;
    })
    .join("");
};

const showAppointments = () => {
  if (appointments.length === 0) {
    appointmentsList.innerHTML = `<p class="empty">No appointments yet. Use the booking form above to make one.</p>`;
    return;
  }

  const sorted = [...appointments].sort((a, b) => {
    return (a.date + a.time).localeCompare(b.date + b.time);
  });

  const items = sorted
    .map((appointment) => {
      const service = findById(services, appointment.serviceId);
      const doctor = findById(doctors, appointment.doctorId);

      return `
        <li class="appointment">
          <div>
            <strong>${service.name}</strong> with ${doctor.name}<br />
            <span class="appointment-meta">
              ${formatDate(appointment.date)}, ${formatTime(appointment.time)}
              for ${escapeHtml(appointment.name)}
            </span>
          </div>
          <button type="button" class="btn-cancel" data-id="${appointment.id}">Cancel visit</button>
        </li>`;
    })
    .join("");

  appointmentsList.innerHTML = `<ul class="appointment-list">${items}</ul>`;

  appointmentsList.querySelectorAll(".btn-cancel").forEach((button) => {
    button.addEventListener("click", () => cancelAppointment(button.dataset.id));
  });
};

const showConfirmation = (appointment) => {
  const service = findById(services, appointment.serviceId);
  const doctor = findById(doctors, appointment.doctorId);
  const firstName = appointment.name.split(" ")[0];

  confirmationTitle.textContent = `You’re booked in, ${firstName}.`;
  confirmationDetails.innerHTML = `
    <dt>Service</dt><dd>${service.name}</dd>
    <dt>Doctor</dt><dd>${doctor.name}</dd>
    <dt>When</dt><dd>${formatDate(appointment.date)}, ${formatTime(appointment.time)}</dd>`;

  bookingForm.hidden = true;
  confirmation.hidden = false;
};

const checkForm = () => {
  if (selectedDate === "") return "Choose a day for your visit.";
  if (selectedTime === "") return "Choose a time.";
  if (nameInput.value.trim().length < 2) return "Enter your full name.";
  if (phoneInput.value.replace(/\D/g, "").length < 7) {
    return "Enter a phone number we can reach you on.";
  }
  return "";
};

const bookAppointment = () => {
  const appointment = {
    id: Date.now(),
    serviceId: serviceSelect.value,
    doctorId: doctorSelect.value,
    date: selectedDate,
    time: selectedTime,
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim()
  };

  appointments.push(appointment);
  saveAppointments();
  showAppointments();
  showConfirmation(appointment);
};

const cancelAppointment = (id) => {
  appointments = appointments.filter((appointment) => String(appointment.id) !== id);
  saveAppointments();
  showAppointments();
  showTimes();
};

const startNewBooking = () => {
  selectedDate = "";
  selectedTime = "";
  showDays();
  showTimes();

  confirmation.hidden = true;
  bookingForm.hidden = false;
};

serviceSelect.addEventListener("change", () => {
  selectedTime = "";
  showDoctorOptions();
  showTimes();
});

doctorSelect.addEventListener("change", () => {
  selectedTime = "";
  showTimes();
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = checkForm();
  formError.textContent = message;

  if (message === "") {
    bookAppointment();
  }
});

bookAgainBtn.addEventListener("click", startNewBooking);

loadAppointments();
showServiceOptions();
showDoctorOptions();
showDays();
showTimes();
showServicesAndDoctors();
showAppointments();
