(() => {
  const STORAGE_KEY = 'mundopet_appointments_v1';
  const INIT_FLAG_KEY = 'mundopet_initialized_v1';

  const PERIOD_WINDOWS = {
    morning: { start: 9 * 60, end: 12 * 60 },
    afternoon: { start: 13 * 60, end: 18 * 60 },
    night: { start: 19 * 60, end: 21 * 60 },
  };

  const filterDateInput = document.getElementById('filter-date');
  const agendaSections = document.getElementById('agenda-sections');
  const listMorning = document.getElementById('list-morning');
  const listAfternoon = document.getElementById('list-afternoon');
  const listNight = document.getElementById('list-night');

  const openModalBtn = document.getElementById('open-modal-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalDialog = modalBackdrop.querySelector('.modal-dialog');
  const appointmentForm = document.getElementById('appointment-form');

  const fields = {
    tutorName: document.getElementById('tutor-name'),
    petName: document.getElementById('pet-name'),
    phone: document.getElementById('tutor-phone'),
    service: document.getElementById('service-description'),
    date: document.getElementById('appointment-date'),
    time: document.getElementById('appointment-time'),
  };

  function getTodayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  }

  function timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  function getPeriodByTime(timeStr) {
    const totalMinutes = timeToMinutes(timeStr);
    if (totalMinutes === null) return null;

    if (totalMinutes >= PERIOD_WINDOWS.morning.start && totalMinutes <= PERIOD_WINDOWS.morning.end) {
      return 'morning';
    }
    if (totalMinutes >= PERIOD_WINDOWS.afternoon.start && totalMinutes <= PERIOD_WINDOWS.afternoon.end) {
      return 'afternoon';
    }
    if (totalMinutes >= PERIOD_WINDOWS.night.start && totalMinutes <= PERIOD_WINDOWS.night.end) {
      return 'night';
    }
    return null;
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function loadAppointments() {
    const isInitialized = localStorage.getItem(INIT_FLAG_KEY);
    if (!isInitialized) {
      const today = getTodayISO();
      const seedData = [
        {
          id: crypto.randomUUID(),
          tutorName: 'Fernanda Costa',
          petName: 'Thor',
          phone: '(81) 99812-3456',
          service: 'Vacinação',
          date: today,
          time: '09:00',
        },
        {
          id: crypto.randomUUID(),
          tutorName: 'João Pedro',
          petName: 'Mel',
          phone: '(81) 98765-4321',
          service: 'Corte de unhas',
          date: today,
          time: '13:00',
        },
        {
          id: crypto.randomUUID(),
          tutorName: 'Camila Almeida',
          petName: 'Max',
          phone: '(81) 99123-9876',
          service: 'Limpeza de dentes',
          date: today,
          time: '20:00',
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
      localStorage.setItem(INIT_FLAG_KEY, 'true');
      return seedData;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  let appointments = loadAppointments();

  function saveAppointments() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  }

  function createAppointmentElement(item) {
    const li = document.createElement('li');
    li.className = 'appointment-item';
    li.dataset.id = item.id;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'appointment-time';
    timeSpan.textContent = item.time;

    const clientSpan = document.createElement('span');
    clientSpan.className = 'appointment-client';
    const petStrong = document.createElement('strong');
    petStrong.textContent = item.petName;
    clientSpan.appendChild(petStrong);
    clientSpan.appendChild(document.createTextNode(` / ${item.tutorName}`));

    const serviceSpan = document.createElement('span');
    serviceSpan.className = 'appointment-service';
    serviceSpan.textContent = item.service;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.dataset.action = 'remove';
    removeBtn.dataset.id = item.id;
    removeBtn.textContent = 'Remover agendamento';
    removeBtn.setAttribute('aria-label', `Remover agendamento de ${item.petName} às ${item.time}`);

    li.append(timeSpan, clientSpan, serviceSpan, removeBtn);
    return li;
  }

  function renderPeriodList(container, items) {
    container.innerHTML = '';

    if (items.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-state';
      emptyLi.textContent = 'Nenhum agendamento para este período.';
      container.appendChild(emptyLi);
      return;
    }

    items.forEach((item) => {
      container.appendChild(createAppointmentElement(item));
    });
  }

  function renderAgenda() {
    const selectedDate = filterDateInput.value;
    const filtered = appointments
      .filter((item) => item.date === selectedDate)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const grouped = {
      morning: [],
      afternoon: [],
      night: [],
    };

    filtered.forEach((item) => {
      const period = getPeriodByTime(item.time);
      if (period && grouped[period]) {
        grouped[period].push(item);
      }
    });

    renderPeriodList(listMorning, grouped.morning);
    renderPeriodList(listAfternoon, grouped.afternoon);
    renderPeriodList(listNight, grouped.night);
  }

  function setFieldError(fieldKey, message) {
    const input = fields[fieldKey];
    const errorSpan = document.getElementById(`error-${fieldKey}`);
    const wrapper = input.closest('.input-field');

    if (message) {
      errorSpan.textContent = message;
      wrapper.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorSpan.textContent = '';
      wrapper.classList.remove('invalid');
      input.removeAttribute('aria-invalid');
    }
  }

  function clearAllErrors() {
    Object.keys(fields).forEach((key) => setFieldError(key, ''));
  }

  function validateForm() {
    clearAllErrors();
    let firstInvalidField = null;

    const markInvalid = (key, message) => {
      setFieldError(key, message);
      if (!firstInvalidField) {
        firstInvalidField = fields[key];
      }
    };

    const tutorName = fields.tutorName.value.trim();
    const petName = fields.petName.value.trim();
    const phoneDigits = fields.phone.value.replace(/\D/g, '');
    const service = fields.service.value.trim();
    const date = fields.date.value;
    const time = fields.time.value;

    if (!tutorName) {
      markInvalid('tutorName', 'Informe o nome do tutor.');
    }

    if (!petName) {
      markInvalid('petName', 'Informe o nome do pet.');
    }

    if (!phoneDigits) {
      markInvalid('phone', 'Informe o telefone para contato.');
    } else if (phoneDigits.length < 10) {
      markInvalid('phone', 'Digite um telefone válido com DDD (10 ou 11 dígitos).');
    }

    if (!service) {
      markInvalid('service', 'Descreva o serviço a ser realizado.');
    }

    if (!date) {
      markInvalid('date', 'Selecione a data do agendamento.');
    }

    if (!time) {
      markInvalid('time', 'Selecione o horário do agendamento.');
    } else {
      const period = getPeriodByTime(time);
      if (!period) {
        markInvalid(
          'time',
          'Horário indisponível. Escolha entre 09:00–12:00, 13:00–18:00 ou 19:00–21:00.'
        );
      } else if (date) {
        const hasConflict = appointments.some(
          (item) => item.date === date && item.time === time
        );
        if (hasConflict) {
          markInvalid('time', 'Já existe um agendamento neste horário para a data selecionada.');
        }
      }
    }

    if (firstInvalidField) {
      firstInvalidField.focus();
      return false;
    }

    return true;
  }

  function openModal() {
    appointmentForm.reset();
    clearAllErrors();
    fields.date.value = filterDateInput.value || getTodayISO();

    modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      fields.tutorName.focus();
    });
  }

  function closeModal() {
    modalBackdrop.hidden = true;
    document.body.style.overflow = '';
    openModalBtn.focus();
  }

  function trapFocus(event) {
    if (modalBackdrop.hidden || event.key !== 'Tab') return;

    const focusableSelectors =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(modalDialog.querySelectorAll(focusableSelectors));
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  openModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);

  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!modalBackdrop.hidden) {
      if (event.key === 'Escape') {
        closeModal();
      } else {
        trapFocus(event);
      }
    }
  });

  fields.phone.addEventListener('input', (event) => {
    event.target.value = formatPhone(event.target.value);
    setFieldError('phone', '');
  });

  Object.entries(fields).forEach(([key, input]) => {
    if (key === 'phone') return;
    input.addEventListener('input', () => setFieldError(key, ''));
  });

  appointmentForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const newAppointment = {
      id: crypto.randomUUID(),
      tutorName: fields.tutorName.value.trim(),
      petName: fields.petName.value.trim(),
      phone: fields.phone.value.trim(),
      service: fields.service.value.trim(),
      date: fields.date.value,
      time: fields.time.value,
    };

    appointments.push(newAppointment);
    saveAppointments();

    filterDateInput.value = newAppointment.date;
    renderAgenda();
    closeModal();
  });

  filterDateInput.addEventListener('change', renderAgenda);

  agendaSections.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-action="remove"]');
    if (!removeBtn) return;

    const { id } = removeBtn.dataset;
    appointments = appointments.filter((item) => item.id !== id);
    saveAppointments();
    renderAgenda();
  });

  filterDateInput.value = getTodayISO();
  renderAgenda();
})();