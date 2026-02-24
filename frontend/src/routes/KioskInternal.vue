<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { apiClient } from "@/api/client";
import { useRouter } from "vue-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  isAfter,
  isEqual,
  startOfDay,
  startOfMinute,
  subDays,
  subYears,
} from "date-fns";

const router = useRouter();

const now = ref(startOfMinute(new Date()));
const lastYear = computed(() => startOfDay(subYears(now.value, 1)));
const last7Days = computed(() => startOfDay(subDays(now.value, 7)));
const last30Days = computed(() => startOfDay(subDays(now.value, 30)));

const parseDate = (value?: string) => (value ? new Date(value) : null);

const parseQuantity = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("no-NO").format(Math.round(value));

const getPurchaseItemCount = (purchase: any) => {
  if (!Array.isArray(purchase?.products)) return 0;
  return purchase.products.reduce((sum: number, product: any) => {
    return sum + parseQuantity(product?.quantity);
  }, 0);
};

const buildPopularItems = (purchaseList: any[], limit = 10) => {
  const totals = new Map<string, number>();

  purchaseList.forEach((purchase) => {
    if (!Array.isArray(purchase?.products)) return;

    purchase.products.forEach((product: any) => {
      const baseName =
        product?.name || product?.variantName || "Ukjent produkt";
      const variant =
        product?.variantName && product?.name ? `${product.variantName}` : null;
      const label = variant ? `${baseName} (${variant})` : baseName;
      const quantity = parseQuantity(product?.quantity);
      if (quantity <= 0) return;
      totals.set(label, (totals.get(label) || 0) + quantity);
    });
  });

  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  router.push("/");
};

const lastYearISOString = computed(() => lastYear.value.toISOString());
const nowISOString = computed(() => now.value.toISOString());

const queryClient = useQueryClient();

const productsQuery = computed(() => {
  return queryOptions({
    queryKey: ["zettle", "purchases"],
    queryFn: () => {
      console.log("I am now fetch bitch", {
        lastYearISOString: lastYearISOString.value,
        nowISOString: nowISOString.value,
      });
      return apiClient.api.zettle.purchases
        .$get({
          query: {
            startDate: lastYearISOString.value,
            endDate: nowISOString.value,
          },
        })
        .then((res) => res.json());
    },
  });
});

const {
  data: purchases,
  isPending,
  isError,
  error,
  refetch,
} = useQuery(productsQuery);

const lastYearPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];

  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, lastYear.value) : false;
  });
});

const last7DaysPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];

  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, last7Days.value) : false;
  });
});

const last30DaysPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];

  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, last30Days.value) : false;
  });
});

const totalItemsLast7Days = computed(() =>
  last7DaysPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const totalItemsLast30Days = computed(() =>
  last30DaysPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const totalItemsLastYear = computed(() =>
  lastYearPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const popularItemsLast7Days = computed(() =>
  buildPopularItems(last7DaysPurchases.value),
);

const popularItemsLast30Days = computed(() =>
  buildPopularItems(last30DaysPurchases.value),
);

const popularItemsLastYear = computed(() =>
  buildPopularItems(lastYearPurchases.value),
);

onMounted(() => {
  const intervalId = setInterval(() => {
    const newValue = startOfMinute(new Date());
    if (isEqual(now.value, newValue)) return;
    now.value = newValue;
    setTimeout(() => {
      queryClient.refetchQueries(productsQuery.value);
    }, 200);
  }, 1000);

  return () => clearInterval(intervalId);
});
</script>

<template>
  <div class="internal-kiosk-screen">
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
    <div class="content">
      <div v-if="isPending" class="loading">
        <div class="spinner"></div>
        <p>Laster statistikk...</p>
      </div>
      <div v-else-if="isError && error" class="error">
        <p>{{ error }}</p>
        <button @click="() => refetch()" class="retry-btn">Prøv igjen</button>
      </div>
      <div v-else class="stats-container">
        <div class="section-title">Totalt antall produkter solgt</div>

        <div class="cards-grid">
          <div class="stat-card">
            <div class="card-label">Siste 7 dager</div>
            <div class="card-value">
              {{ formatNumber(totalItemsLast7Days) }}
            </div>
          </div>

          <div class="stat-card">
            <div class="card-label">Siste 30 dager</div>
            <div class="card-value">
              {{ formatNumber(totalItemsLast30Days) }}
            </div>
          </div>

          <div class="stat-card">
            <div class="card-label">Siste år</div>
            <div class="card-value">{{ formatNumber(totalItemsLastYear) }}</div>
          </div>
        </div>

        <div class="section-title" style="margin-top: 60px">Populære varer</div>

        <div class="popular-grid">
          <div class="popular-card">
            <div class="card-header">7 dager</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsLast7Days"
                :key="`7d-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsLast7Days.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">30 dager</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsLast30Days"
                :key="`30d-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsLast30Days.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">1 år</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsLastYear"
                :key="`1y-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsLastYear.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>
        </div>

        <div class="last-updated">
          Oppdatert {{ now.toLocaleString("no-NO") }}
        </div>
      </div>
    </div>
  </div>
</template>

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
  background: linear-gradient(135deg, #0f1a2e 0%, #1a2a4e 100%);
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

.close-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1000;
  padding: 0;
  outline: none;
  box-shadow: none;
}

.close-btn:hover {
  color: #ffffff;
  transform: rotate(90deg);
}

.content {
  flex: 1;
  padding: 32px;
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
  max-width: 1600px;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.stat-card {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.15) 0%,
    rgba(44, 100, 200, 0.05) 100%
  );
  border: 1px solid rgba(99, 150, 220, 0.3);
  border-radius: 16px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(99, 150, 220, 0.6),
    transparent
  );
}

.stat-card:hover {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.25) 0%,
    rgba(44, 100, 200, 0.1) 100%
  );
  border-color: rgba(99, 150, 220, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(44, 100, 200, 0.15);
}

.card-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.card-value {
  font-size: 2.8rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.card-products {
  border-top: 1px solid rgba(99, 150, 220, 0.2);
  padding-top: 16px;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 0.9rem;
}

.product-name {
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
}

.product-qty {
  color: #ffffff;
  font-weight: 600;
  margin-left: 12px;
}

.popular-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.popular-card {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.15) 0%,
    rgba(44, 100, 200, 0.05) 100%
  );
  border: 1px solid rgba(99, 150, 220, 0.3);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.popular-card:hover {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.25) 0%,
    rgba(44, 100, 200, 0.1) 100%
  );
  border-color: rgba(99, 150, 220, 0.5);
  box-shadow: 0 12px 40px rgba(44, 100, 200, 0.15);
}

.card-header {
  padding: 16px 24px;
  background: rgba(44, 100, 200, 0.1);
  border-bottom: 1px solid rgba(99, 150, 220, 0.3);
  font-weight: 600;
  color: #ffffff;
  font-size: 1rem;
  letter-spacing: -0.01em;
}

.items-list {
  padding: 16px 24px;
  max-height: 500px;
  overflow-y: auto;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(99, 150, 220, 0.15);
  font-size: 0.95rem;
}

.item-row:last-child {
  border-bottom: none;
}

.item-name {
  color: rgba(255, 255, 255, 1);
  flex: 1;
}

.item-qty {
  color: #ffffff;
  font-weight: 600;
  margin-left: 12px;
  min-width: 50px;
  text-align: right;
}

.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 32px 0;
}

.no-data {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 24px;
  font-size: 0.95rem;
}

.last-updated {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  padding: 24px;
  font-weight: 500;
}

@media (max-width: 1200px) {
  .cards-grid,
  .popular-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 24px 20px;
  }

  .card-value {
    font-size: 2.2rem;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 24px;
  }

  .section-title {
    font-size: 1.3rem;
    margin-bottom: 16px;
  }

  .cards-grid,
  .popular-grid {
    gap: 16px;
    margin-bottom: 32px;
  }

  .stat-card,
  .popular-card {
    padding: 20px 16px;
  }

  .card-value {
    font-size: 2rem;
  }

  .card-header {
    padding: 12px 16px;
    font-size: 0.95rem;
  }

  .items-list {
    padding: 12px 16px;
  }

  .item-row {
    padding: 8px 0;
    font-size: 0.85rem;
  }
}
</style>
