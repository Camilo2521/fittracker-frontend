/**
 * Onboarding Manager
 * 3-step flow: Nombre → Objetivo → Peso Inicial
 * Nunca mostrar "Usuario" como default
 */

class OnboardingManager {
  constructor(db, container = 'app-container') {
    this.db = db;
    this.container = document.getElementById(container);
    this.currentStep = 0;
    this.userData = {
      name: '',
      email: '',
      password: '',
      goal: '',
      startWeight: 0,
      targetWeight: 0
    };
  }

  /**
   * Verificar si el usuario ha completado onboarding
   */
  async hasCompletedOnboarding() {
    const user = await this.db.getUser?.();
    return !!(user?.completedOnboarding);
  }

  /**
   * Mostrar onboarding si es necesario
   */
  async showIfNeeded() {
    const completed = await this.hasCompletedOnboarding();
    if (!completed) {
      this.show();
      return false;
    }
    return true;
  }

  /**
   * Mostrar modal de onboarding
   */
  show() {
    const modal = document.createElement('div');
    modal.id = 'onboarding-modal';
    modal.innerHTML = `
      <div class="onboarding-overlay">
        <div class="onboarding-card">
          <div class="onboarding-header">
            <h1>Bienvenido a <span class="brand-accent">FitTracker</span></h1>
            <p class="onboarding-subtitle">Personaliza tu experiencia en 3 pasos</p>
          </div>

          <div class="onboarding-steps">
            <!-- STEP 1: Nombre + Cuenta -->
            <div class="onboarding-step active" data-step="1">
              <div class="step-indicator">
                <span class="step-number">1</span>
                <span class="step-total">/ 3</span>
              </div>

              <!-- Tabs: Registro / Login -->
              <div class="auth-tabs">
                <button class="auth-tab active" data-tab="register">Crear cuenta</button>
                <button class="auth-tab" data-tab="login">Ya tengo cuenta</button>
              </div>

              <!-- Registro -->
              <div id="tab-register" class="auth-panel">
                <h2>Crea tu cuenta</h2>
                <p class="step-subtitle">Tus datos quedan guardados en la nube</p>
                <div class="input-group">
                  <input
                    type="text"
                    id="onboard-name"
                    placeholder="Tu nombre"
                    class="onboarding-input"
                    maxlength="30"
                    autocomplete="name"
                  >
                  <input
                    type="email"
                    id="onboard-email"
                    placeholder="Tu email"
                    class="onboarding-input"
                    autocomplete="email"
                  >
                  <input
                    type="password"
                    id="onboard-password"
                    placeholder="Contraseña (mín. 8 caracteres)"
                    class="onboarding-input"
                    minlength="8"
                    autocomplete="new-password"
                  >
                  <div class="input-hint">Mínimo 2 caracteres en el nombre · 8 en la contraseña</div>
                </div>
              </div>

              <!-- Login -->
              <div id="tab-login" class="auth-panel" style="display:none">
                <h2>Inicia sesión</h2>
                <p class="step-subtitle">Recupera tu cuenta existente</p>
                <div class="input-group">
                  <input
                    type="email"
                    id="login-email"
                    placeholder="Tu email"
                    class="onboarding-input"
                    autocomplete="email"
                  >
                  <input
                    type="password"
                    id="login-password"
                    placeholder="Tu contraseña"
                    class="onboarding-input"
                    autocomplete="current-password"
                  >
                </div>
                <button id="btn-login" class="btn-primary" style="margin-top:16px;width:100%">Iniciar sesión</button>
              </div>
            </div>

            <!-- STEP 2: Objetivo -->
            <div class="onboarding-step" data-step="2">
              <div class="step-indicator">
                <span class="step-number">2</span>
                <span class="step-total">/ 3</span>
              </div>
              
              <h2>¿Cuál es tu objetivo?</h2>
              <p class="step-subtitle">Esto personalizará tus recomendaciones</p>
              
              <div class="goal-cards">
                <button class="goal-card" data-goal="weight-loss">
                  <div class="goal-icon">📉</div>
                  <h3>Perder Peso</h3>
                  <p>Déficit calórico + cardio</p>
                </button>
                
                <button class="goal-card" data-goal="muscle-gain">
                  <div class="goal-icon">💪</div>
                  <h3>Ganar Músculo</h3>
                  <p>Superávit + entrenamiento fuerza</p>
                </button>
                
                <button class="goal-card" data-goal="maintenance">
                  <div class="goal-icon">⚖️</div>
                  <h3>Mantenerme</h3>
                  <p>Balance + hábitos consistentes</p>
                </button>
              </div>
            </div>

            <!-- STEP 3: Peso Inicial -->
            <div class="onboarding-step" data-step="3">
              <div class="step-indicator">
                <span class="step-number">3</span>
                <span class="step-total">/ 3</span>
              </div>
              
              <h2>Tu punto de partida</h2>
              <p class="step-subtitle">Peso actual y meta</p>
              
              <div class="weight-input-group">
                <div class="weight-field">
                  <label>Peso Actual</label>
                  <div class="weight-input-wrapper">
                    <input 
                      type="number" 
                      id="onboard-current-weight" 
                      placeholder="70" 
                      class="weight-input"
                      step="0.1"
                      min="20"
                      max="250"
                    >
                    <span class="weight-unit">kg</span>
                  </div>
                </div>

                <div class="weight-field">
                  <label>Peso Meta</label>
                  <div class="weight-input-wrapper">
                    <input 
                      type="number" 
                      id="onboard-target-weight" 
                      placeholder="65" 
                      class="weight-input"
                      step="0.1"
                      min="20"
                      max="250"
                    >
                    <span class="weight-unit">kg</span>
                  </div>
                </div>
              </div>

              <div class="weight-progress-preview">
                <div class="weight-bar">
                  <div class="weight-progress" id="weight-progress-bar"></div>
                </div>
                <div class="weight-info">
                  <span id="weight-diff">Cambio: -- kg</span>
                  <span id="weight-direction" class="weight-direction"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Controles -->
          <div class="onboarding-footer">
            <button id="onboard-prev" class="btn-secondary hidden">← Anterior</button>
            <button id="onboard-next" class="btn-primary">Siguiente →</button>
          </div>

          <div class="onboarding-progress">
            <div class="progress-dot active" data-step="1"></div>
            <div class="progress-dot" data-step="2"></div>
            <div class="progress-dot" data-step="3"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachEventListeners();
    this.currentStep = 1;
  }

  /**
   * Adjuntar event listeners
   */
  attachEventListeners() {
    const nextBtn = document.getElementById('onboard-next');
    const prevBtn = document.getElementById('onboard-prev');

    // Auth tabs (Registro / Login)
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
    });

    // Botón login
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.addEventListener('click', () => this._handleLogin());

    // Goal cards
    document.querySelectorAll('.goal-card').forEach(card => {
      card.addEventListener('click', () => this.selectGoal(card));
    });

    // Weight inputs
    const currentWeight = document.getElementById('onboard-current-weight');
    const targetWeight = document.getElementById('onboard-target-weight');
    if (currentWeight && targetWeight) {
      currentWeight.addEventListener('input', () => this.updateWeightPreview());
      targetWeight.addEventListener('input', () => this.updateWeightPreview());
    }

    // Botones
    nextBtn.addEventListener('click', () => this.nextStep());
    prevBtn.addEventListener('click', () => this.previousStep());

    // Enter key
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.currentStep === 1) {
        this.nextStep();
      }
    });
  }

  /**
   * Cambiar entre tabs Registro / Login
   */
  _switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('tab-register').style.display = tab === 'register' ? '' : 'none';
    document.getElementById('tab-login').style.display    = tab === 'login'    ? '' : 'none';
    this._activeTab = tab;
  }

  /**
   * Iniciar sesión con cuenta existente
   */
  async _handleLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showError('Ingresa tu email y contraseña');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showError('Email inválido');
      return;
    }

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Iniciando sesión…';

    try {
      if (!window.SYNC) throw new Error('Servicio de sincronización no disponible');
      const data = await SYNC.login(email, password);
      if (!data?.accessToken) {
        this.showError('Email o contraseña incorrectos');
        return;
      }

      const user = data.user || {};
      const localUser = {
        name:                user.name  || email.split('@')[0],
        email,
        goal:                user.goal  || 'maintain',
        startWeight:         user.start_weight   || null,
        targetWeight:        user.target_weight  || null,
        currentWeight:       user.weight         || null,
        completedOnboarding: true,
        createdAt:           new Date().toISOString(),
      };

      const newId = await this.db.addUser(localUser);
      localUser.id = newId;
      // Prefer backend UUID for API requests; fall back to local key
      SYNC.setUserId(String(user.id || newId));

      window.dispatchEvent(new CustomEvent('onboardingComplete', { detail: localUser }));
      const modal = document.getElementById('onboarding-modal');
      modal.classList.add('close');
      setTimeout(() => { modal.remove(); this.updateHeaderName(localUser.name); }, 300);
    } catch (err) {
      this.showError(err.message || 'Error al iniciar sesión');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    }
  }

  /**
   * Ir al siguiente paso
   */
  async nextStep() {
    if (!this.validateStep(this.currentStep)) {
      return;
    }

    if (this.currentStep === 3) {
      // Completar onboarding
      await this.complete();
      return;
    }

    this.currentStep++;
    this.updateUI();
  }

  /**
   * Ir al paso anterior
   */
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  }

  /**
   * Validar paso actual
   */
  validateStep(step) {
    switch (step) {
      case 1:
        // Si está en el tab de login, el flujo es manejado por _handleLogin
        if (this._activeTab === 'login') {
          this._handleLogin();
          return false; // no avanzar pasos
        }
        const name     = document.getElementById('onboard-name').value.trim();
        const email    = document.getElementById('onboard-email').value.trim();
        const password = document.getElementById('onboard-password').value;
        if (name.length < 2) {
          this.showError('Por favor ingresa un nombre válido (mínimo 2 caracteres)');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          this.showError('Por favor ingresa un email válido');
          return false;
        }
        if (password.length < 8) {
          this.showError('La contraseña debe tener al menos 8 caracteres');
          return false;
        }
        this.userData.name     = name;
        this.userData.email    = email;
        this.userData.password = password;
        return true;

      case 2:
        const selectedGoal = document.querySelector('.goal-card.selected');
        if (!selectedGoal) {
          this.showError('Selecciona un objetivo');
          return false;
        }
        return true;

      case 3:
        const current = parseFloat(document.getElementById('onboard-current-weight').value);
        const target = parseFloat(document.getElementById('onboard-target-weight').value);
        
        if (!current || !target || current <= 0 || target <= 0) {
          this.showError('Ingresa pesos válidos');
          return false;
        }
        
        this.userData.startWeight = current;
        this.userData.targetWeight = target;
        return true;

      default:
        return true;
    }
  }

  /**
   * Seleccionar objetivo
   */
  selectGoal(card) {
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    this.userData.goal = card.dataset.goal;
  }

  /**
   * Actualizar preview de progreso de peso
   */
  updateWeightPreview() {
    const current = parseFloat(document.getElementById('onboard-current-weight').value) || 0;
    const target = parseFloat(document.getElementById('onboard-target-weight').value) || 0;

    if (current === 0 || target === 0) {
      document.getElementById('weight-diff').textContent = 'Cambio: -- kg';
      return;
    }

    const diff = current - target;
    const direction = diff > 0 ? '📉 Bajar' : diff < 0 ? '📈 Subir' : '✓ Mantener';
    
    document.getElementById('weight-diff').textContent = `Cambio: ${Math.abs(diff).toFixed(1)} kg`;
    document.getElementById('weight-direction').textContent = direction;

    // Actualizar barra de progreso
    const percentage = Math.abs(diff) / Math.max(current, target) * 100;
    const bar = document.getElementById('weight-progress-bar');
    bar.style.width = Math.min(percentage, 100) + '%';
  }

  /**
   * Actualizar UI al cambiar paso
   */
  updateUI() {
    // Ocultar todos los pasos
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.classList.remove('active');
    });

    // Mostrar paso actual
    document.querySelector(`[data-step="${this.currentStep}"]`).classList.add('active');

    // Actualizar progreso
    document.querySelectorAll('.progress-dot').forEach(dot => {
      dot.classList.remove('active');
    });
    document.querySelector(`.progress-dot[data-step="${this.currentStep}"]`).classList.add('active');

    // Botón anterior
    const prevBtn = document.getElementById('onboard-prev');
    if (this.currentStep > 1) {
      prevBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.add('hidden');
    }

    // Texto botón siguiente
    const nextBtn = document.getElementById('onboard-next');
    if (this.currentStep === 3) {
      nextBtn.textContent = 'Completar ✓';
    } else {
      nextBtn.textContent = 'Siguiente →';
    }
  }

  /**
   * Mostrar error con toast visual
   */
  showError(message) {
    console.warn(message);
    const existing = document.getElementById('onboarding-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'onboarding-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
      background: #D32F2F; color: #fff; padding: 10px 20px; border-radius: 8px;
      font-size: 14px; font-weight: 600; z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.25s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /**
   * Completar onboarding
   */
  async complete() {
    // Mapear enums del frontend al formato que espera el backend
    const GOAL_MAP = { 'weight-loss': 'lose', 'muscle-gain': 'gain', 'maintenance': 'maintain' };
    const backendGoal = GOAL_MAP[this.userData.goal] || 'maintain';

    const user = {
      name:          this.userData.name,
      email:         this.userData.email,
      goalType:      this.userData.goal,      // formato frontend (IndexedDB)
      goal:          backendGoal,             // formato backend
      startWeight:   this.userData.startWeight,
      targetWeight:  this.userData.targetWeight,
      currentWeight: this.userData.startWeight,
      createdAt:     new Date().toISOString(),
      completedOnboarding: true,
    };

    try {
      const existing = await this.db.getUser?.().catch(() => null);
      if (existing && existing.completedOnboarding === undefined) {
        await this.db.updateUser({ ...existing, ...user });
        user.id = existing.id;
      } else if (!existing) {
        const newId = await this.db.addUser(user);
        user.id = newId;
      }

      // Registrar en el backend y capturar tokens
      if (window.SYNC) {
        const uid = String(user.id || Date.now());
        SYNC.setUserId(uid);
        try {
          const regData = await SYNC.registerUser({
            externalId:    uid,
            name:          user.name,
            email:         user.email,
            password:      this.userData.password,
            weight:        user.startWeight,
            goal:          backendGoal,
          });
          // Prefer backend UUID over local IndexedDB key for API calls
          if (regData?.user?.id) SYNC.setUserId(String(regData.user.id));
        } catch { /* non-fatal — user can continue offline */ }
      }

      window.dispatchEvent(new CustomEvent('onboardingComplete', { detail: user }));

      const modal = document.getElementById('onboarding-modal');
      modal.classList.add('close');
      setTimeout(() => {
        modal.remove();
        this.updateHeaderName(user.name);
      }, 300);
    } catch (error) {
      this.showError('Error guardando datos: ' + error.message);
    }
  }

  /**
   * Actualizar header con nombre del usuario
   */
  updateHeaderName(name) {
    const headerDate = document.querySelector('.header-date');
    if (headerDate) {
      const hour = new Date().getHours();
      let greeting = '';
      if (hour < 12) greeting = `☀️ Buenos días, ${name}`;
      else if (hour < 19) greeting = `Buenas tardes, ${name}`;
      else greeting = `🌙 Buenas noches, ${name}`;
      
      headerDate.innerHTML = greeting;
    }
  }
}

window.OnboardingManager = OnboardingManager;
