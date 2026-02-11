<template>
  <div class="internal-kiosk-screen">
    <div class="header">
      <h1>Salgsstatistikk</h1>
      <button @click="exitFullscreen" class="close-btn">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div class="content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Laster statistikk...</p>
      </div>
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadData" class="retry-btn">Prøv igjen</button>
      </div>
      <div v-else class="stats-container">
        <!-- Total products sold this year -->
        <div class="total-section">
          <div class="total-card">
            <div class="card-label">Totalt solgt i år</div>
            <div class="total-number">
              {{ totalProductsThisYear.toLocaleString("nb-NO") }}
            </div>
            <div class="card-subtitle">produkter</div>
          </div>
        </div>

        <!-- Products section -->
        <div class="products-section">
          <!-- This week -->
          <div class="section-container">
            <div class="section-header">
              <span class="icon">📅</span>
              <h3>Denne uken</h3>
            </div>
            <div class="products-grid">
              <div v-if="weekProducts.length > 0">
                <div
                  v-for="product in weekProducts"
                  :key="product.name"
                  class="product-box"
                >
                  <div class="product-name">{{ product.name }}</div>
                  <div class="product-amount">{{ product.amount }}</div>
                </div>
              </div>
              <div v-else class="no-data">Ingen salg denne uken</div>
            </div>
          </div>

          <!-- This year -->
          <div class="section-container">
            <div class="section-header">
              <span class="icon">📈</span>
              <h3>I år</h3>
            </div>
            <div class="products-grid">
              <div v-if="yearProducts.length > 0">
                <div
                  v-for="product in yearProducts"
                  :key="product.name"
                  class="product-box"
                >
                  <div class="product-name">{{ product.name }}</div>
                  <div class="product-amount">{{ product.amount }}</div>
                </div>
              </div>
              <div v-else class="no-data">Ingen salg i år</div>
            </div>
          </div>
        </div>

        <div class="last-updated">Sist oppdatert: {{ lastUpdated }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { apiClient } from "@/api/client";

interface ProductStat {
  name: string;
  amount: number;
}

const emit = defineEmits<{
  close: [];
}>();

const loading = ref(true);
const error = ref<string | null>(null);
const totalProductsThisYear = ref(0);
const weekProducts = ref<ProductStat[]>([]);
const yearProducts = ref<ProductStat[]>([]);
const lastUpdated = ref("");

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  emit("close");
};

const aggregateProducts = (purchases: any[]): ProductStat[] => {
  const productMap = new Map<string, number>();

  purchases.forEach((purchase) => {
    if (purchase.products) {
      purchase.products.forEach((product: any) => {
        if (product.name) {
          const quantity = parseFloat(product.quantity || "1");
          const current = productMap.get(product.name) || 0;
          productMap.set(product.name, current + quantity);
        }
      });
    }
  });

  return Array.from(productMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const getTotalProducts = (purchases: any[]): number => {
  let total = 0;
  purchases.forEach((purchase) => {
    if (purchase.products) {
      purchase.products.forEach((product: any) => {
        const quantity = parseFloat(product.quantity || "1");
        total += quantity;
      });
    }
  });
  return total;
};

const loadData = async (showLoading: boolean = true) => {
  loading.value = showLoading;
  error.value = null;

  try {
    const now = new Date();

    // Calculate date ranges - use UTC to avoid timezone issues
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();

    // Start of year (YYYY-01-01)
    const startOfYear = `${year}-01-01`;

    // Start of week (Monday)
    const mondayOffset = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
    const monday = new Date(year, month, date + mondayOffset);
    const startOfWeek = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

    // Today (YYYY-MM-DD)
    const today = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

    console.log("🔍 Fetching data:", { startOfYear, startOfWeek, today });

    // Fetch data for each period
    const [yearResponse, weekResponse] = await Promise.all([
      apiClient.api.zettle.purchases.$get({
        query: {
          startDate: startOfYear,
          endDate: today,
        },
      }),
      apiClient.api.zettle.purchases.$get({
        query: {
          startDate: startOfWeek,
          endDate: today,
        },
      }),
    ]);

    if (!yearResponse.ok || !weekResponse.ok) {
      throw new Error("Kunne ikke hente data fra API");
    }

    const yearData = await yearResponse.json();
    const weekData = await weekResponse.json();

    console.log("📊 Data received:", {
      yearPurchases: yearData.length,
      weekPurchases: weekData.length,
      yearData: yearData.slice(0, 2), // Log første 2 for debugging
      weekData: weekData.slice(0, 2),
    });

    // Process data
    const yearProductsList = aggregateProducts(yearData);
    const weekProductsList = aggregateProducts(weekData);
    const totalProducts = getTotalProducts(yearData);

    console.log("✅ Processed:", {
      yearProducts: yearProductsList.length,
      weekProducts: weekProductsList.length,
      totalProducts: totalProducts,
      topYearProducts: yearProductsList.slice(0, 5),
      topWeekProducts: weekProductsList.slice(0, 5),
    });

    // Update reactive values
    yearProducts.value = yearProductsList;
    weekProducts.value = weekProductsList;
    totalProductsThisYear.value = totalProducts;

    lastUpdated.value = new Date().toLocaleString("nb-NO");
  } catch (e) {
    console.error("❌ Error loading Zettle data:", e);
    error.value =
      "Kunne ikke laste statistikk. Sjekk at backend-serveren kjører.";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
  // Auto-refresh every 5 minutes
  const intervalId = setInterval(() => loadData(false), 1000 * 30);

  // Cleanup on unmount
  return () => clearInterval(intervalId);
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

.internal-kiosk-screen {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif !important;
  width: 100vw;
  height: 100vh;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.internal-kiosk-screen *,
.internal-kiosk-screen *::before,
.internal-kiosk-screen *::after {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif !important;
  cursor: default !important;
}

.header {
  padding: 24px 48px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.close-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.content {
  flex: 1;
  padding: 48px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
}

.loading,
.error {
  background: rgba(26, 26, 26, 0.8);
  backdrop-filter: blur(10px);
  padding: 48px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  color: #ffffff;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading p,
.error p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 1rem;
}

.retry-btn {
  margin-top: 24px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.stats-container {
  width: 100%;
  max-width: 1400px;
}

.total-section {
  margin-bottom: 48px;
  display: flex;
  justify-content: center;
}

.total-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
  padding: 48px 80px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.total-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(99, 102, 241, 0.5),
    transparent
  );
}

.card-label {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
  font-weight: 600;
}

.total-number {
  font-size: 5rem;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    rgba(255, 255, 255, 0.7) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 16px 0;
  line-height: 1;
}

.card-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.products-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 32px;
  margin-bottom: 32px;
}

.section-container {
  background: rgba(26, 26, 26, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(20, 20, 20, 0.5);
}

.section-header .icon {
  font-size: 1.5rem;
}

.section-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.products-grid {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.products-grid > div {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.product-box {
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.product-box::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(99, 102, 241, 0.4),
    transparent
  );
  opacity: 0;
  transition: opacity 0.2s ease;
}

.product-box:hover {
  background: rgba(50, 50, 50, 0.6);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.product-box:hover::before {
  opacity: 1;
}

.product-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.3;
  flex: 1;
}

.product-amount {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    rgba(255, 255, 255, 0.7) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.no-data {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 48px 24px;
  font-size: 0.95rem;
}

.last-updated {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  padding: 24px;
  font-weight: 500;
}

@media (max-width: 1200px) {
  .products-section {
    grid-template-columns: 1fr;
  }

  .products-grid > div {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .total-card {
    padding: 40px 60px;
  }

  .total-number {
    font-size: 4rem;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 20px 24px;
  }

  .header h1 {
    font-size: 1.5rem;
  }

  .content {
    padding: 24px;
  }

  .total-card {
    padding: 32px 40px;
  }

  .total-number {
    font-size: 3rem;
  }
}
</style>
