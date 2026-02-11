<template>
  <div class="internal-kiosk-screen">
    <div class="header">
      <h1>Intern Kioskskjerm - Salgsstatistikk</h1>
      <button @click="exitFullscreen">Lukk</button>
    </div>
    <div class="content">
      <div v-if="loading" class="loading">
        <p>Laster statistikk...</p>
      </div>
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadData">Prøv igjen</button>
      </div>
      <div v-else class="stats-container">
        <!-- Total products sold this year -->
        <div class="total-section">
          <div class="total-card">
            <h2>Totalt solgt i år</h2>
            <div class="total-number">{{ totalProductsThisYear }}</div>
            <p class="subtitle">produkter</p>
          </div>
        </div>

        <!-- Tables section -->
        <div class="tables-section">
          <!-- This week -->
          <div class="table-container">
            <div class="window">
              <div class="title-bar">
                <div class="title-bar-text">📅 Denne uken</div>
              </div>
              <div class="window-body">
                <table v-if="weekProducts.length > 0">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Antall</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in weekProducts" :key="product.name">
                      <td>{{ product.name }}</td>
                      <td>{{ product.amount }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="no-data">Ingen salg denne uken</p>
              </div>
            </div>
          </div>

          <!-- This month -->
          <div class="table-container">
            <div class="window">
              <div class="title-bar">
                <div class="title-bar-text">📊 Denne måneden</div>
              </div>
              <div class="window-body">
                <table v-if="monthProducts.length > 0">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Antall</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in monthProducts" :key="product.name">
                      <td>{{ product.name }}</td>
                      <td>{{ product.amount }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="no-data">Ingen salg denne måneden</p>
              </div>
            </div>
          </div>

          <!-- This year -->
          <div class="table-container">
            <div class="window">
              <div class="title-bar">
                <div class="title-bar-text">📈 I år</div>
              </div>
              <div class="window-body">
                <table v-if="yearProducts.length > 0">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Antall</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in yearProducts" :key="product.name">
                      <td>{{ product.name }}</td>
                      <td>{{ product.amount }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="no-data">Ingen salg i år</p>
              </div>
            </div>
          </div>
        </div>

        <div class="last-updated">
          Sist oppdatert: {{ lastUpdated }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';

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
const monthProducts = ref<ProductStat[]>([]);
const yearProducts = ref<ProductStat[]>([]);
const lastUpdated = ref('');

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  emit('close');
};

const aggregateProducts = (purchases: any[]): ProductStat[] => {
  const productMap = new Map<string, number>();
  
  purchases.forEach(purchase => {
    if (purchase.products) {
      purchase.products.forEach((product: any) => {
        if (product.name) {
          const quantity = parseFloat(product.quantity || '1');
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
  purchases.forEach(purchase => {
    if (purchase.products) {
      purchase.products.forEach((product: any) => {
        const quantity = parseFloat(product.quantity || '1');
        total += quantity;
      });
    }
  });
  return total;
};

const loadData = async () => {
  loading.value = true;
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
    
    // Start of month (YYYY-MM-01)
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Start of week (Monday)
    const mondayOffset = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
    const monday = new Date(year, month, date + mondayOffset);
    const startOfWeek = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    
    // Today (YYYY-MM-DD)
    const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

    console.log('Fetching data:', { startOfYear, startOfMonth, startOfWeek, today });

    // Fetch data for each period
    const [yearResponse, monthResponse, weekResponse] = await Promise.all([
      apiClient.api.zettle.purchases.$get({
        query: {
          startDate: startOfYear,
          endDate: today,
        }
      }),
      apiClient.api.zettle.purchases.$get({
        query: {
          startDate: startOfMonth,
          endDate: today,
        }
      }),
      apiClient.api.zettle.purchases.$get({
        query: {
          startDate: startOfWeek,
          endDate: today,
        }
      })
    ]);

    if (!yearResponse.ok || !monthResponse.ok || !weekResponse.ok) {
      throw new Error('Kunne ikke hente data fra API');
    }

    const yearData = await yearResponse.json();
    const monthData = await monthResponse.json();
    const weekData = await weekResponse.json();

    console.log('Data received:', { 
      yearCount: yearData.length, 
      monthCount: monthData.length, 
      weekCount: weekData.length 
    });

    // Process data
    yearProducts.value = aggregateProducts(yearData);
    monthProducts.value = aggregateProducts(monthData);
    weekProducts.value = aggregateProducts(weekData);
    totalProductsThisYear.value = getTotalProducts(yearData);

    lastUpdated.value = new Date().toLocaleString('nb-NO');
  } catch (e) {
    console.error('Error loading Zettle data:', e);
    error.value = 'Kunne ikke laste statistikk. Sjekk at backend-serveren kjører.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
  // Auto-refresh every 5 minutes
  const intervalId = setInterval(loadData, 5 * 60 * 1000);
  
  // Cleanup on unmount
  return () => clearInterval(intervalId);
});
</script>

<style scoped>
.internal-kiosk-screen {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.header {
  padding: 20px 40px;
  background-color: #000080;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.header h1 {
  margin: 0;
  font-size: 2em;
}

.header button {
  padding: 10px 20px;
  font-size: 1.1em;
  cursor: pointer;
}

.content {
  flex: 1;
  padding: 40px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
}

.loading,
.error {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.error button {
  margin-top: 20px;
  padding: 10px 20px;
  cursor: pointer;
}

.stats-container {
  width: 100%;
  max-width: 1600px;
}

.total-section {
  margin-bottom: 40px;
  display: flex;
  justify-content: center;
}

.total-card {
  background: white;
  padding: 40px 80px;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  text-align: center;
  border: 2px solid #000080;
}

.total-card h2 {
  margin: 0 0 20px 0;
  font-size: 1.8em;
  color: #333;
}

.total-number {
  font-size: 5em;
  font-weight: bold;
  color: #000080;
  margin: 20px 0;
}

.subtitle {
  font-size: 1.5em;
  color: #666;
  margin: 0;
}

.tables-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  margin-bottom: 30px;
}

.table-container {
  display: flex;
  flex-direction: column;
}

.window {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.title-bar {
  background: linear-gradient(180deg, #0997ff, #0053ee 8%, #0050ee 40%, #06f);
  color: white;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 1.1em;
}

.title-bar-text {
  padding: 2px;
}

.window-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  max-height: 500px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.1em;
}

thead {
  background-color: #f0f0f0;
  position: sticky;
  top: 0;
}

th {
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #000080;
  font-weight: bold;
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid #ddd;
}

tbody tr:hover {
  background-color: #f5f5f5;
}

tbody tr:nth-child(even) {
  background-color: #fafafa;
}

.no-data {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.last-updated {
  text-align: center;
  color: white;
  font-size: 1.1em;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

@media (max-width: 1200px) {
  .tables-section {
    grid-template-columns: 1fr;
  }
}
</style>
