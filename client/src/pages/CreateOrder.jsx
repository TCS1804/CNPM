import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../CartContext';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import api from "../lib/axios";
import MapPicker from '../component/MapPicker';
import AddressPicker from '../component/AddressPicker';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ORDER_BASE = import.meta.env.VITE_ORDER_BASE_URL || '/orders';
const PAYMENT_BASE = import.meta.env.VITE_PAYMENT_BASE_URL || '/payments';

const formatCurrency = (value) =>
  (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

function normalizeEmail(s) {
  return String(s || "").trim().replace(/\.+$/, "");
}

function useDebouncedValue(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef();
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);
  return debounced;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ onSuccess, onError, setLoading, selectedPaymentMethod, billingDetails, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentError, setPaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || (!elements && !selectedPaymentMethod) || submitting) return;

    setLoading(true);
    setSubmitting(true);
    try {
      const confirmParams = {
        return_url: window.location.origin,
      };
  
      let result;
      if (selectedPaymentMethod) {
        // For saved payment methods, only pass the payment_method ID
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod,
        }, confirmParams);
      } else {
        // For new payment methods, include billing_details in payment_method
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            ...confirmParams,
            payment_method_data: {
              billing_details: billingDetails,
            },
          },
          redirect: 'if_required',
        });
      }
  
      const { error, paymentIntent } = result;

      // Handle case where Stripe reports the PaymentIntent already succeeded
      if (error) {
        // Some Stripe errors include the payment_intent object (e.g. payment_intent_unexpected_state)
        if (
          error?.code === 'payment_intent_unexpected_state' &&
          error?.payment_intent?.id &&
          error?.payment_intent?.status === 'succeeded'
        ) {
          console.warn('Stripe: payment_intent already succeeded, treating as success', error.payment_intent.id);
          onSuccess(error.payment_intent.id);
        } else {
          setPaymentError(error.message);
          onError(error);
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        // Nếu không error mà cũng không 'succeeded', hiển thị trạng thái cho user
        setPaymentError(`Payment status: ${paymentIntent?.status || 'unknown'}`);
      }
    } catch (err) {
      setPaymentError('Payment failed');
      onError(err);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-white">Payment Details</h3>
      {paymentError && <div className="text-red-500 mb-4">{paymentError}</div>}
      <form onSubmit={handleSubmit}>
        {!selectedPaymentMethod && <PaymentElement />}
        <button
          type="submit"
          disabled={!stripe || (!elements && !selectedPaymentMethod) || submitting}
          className="w-full py-3 mt-4 rounded bg-yellow-500 text-black hover:bg-yellow-600 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
};

const CreateOrder = () => {
  const [customerId, setCustomerId] = useState('');
  const { cart, addToCart, removeFromCart, deleteFromCart, clearCart } = useContext(CartContext);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: { line1: '', city: '', state: '', postal_code: '', country: 'VN' }
  });
  const [transportMode, setTransportMode] = useState('human');
  const debouncedEmail = useDebouncedValue(billingDetails.email, 600);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [customerContact, setCustomerContact] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Cart in CreateOrder:', cart);
  }, [cart]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get(`${ORDER_BASE}/restaurants`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (import.meta.env.DEV) console.log('GET /order/restaurants ok', response.data?.length);
        console.log('Fetched restaurants:', response.data);
        setRestaurants(response.data);
      } catch (err) {
        console.error('Payment initialization error:', err.response?.data || err.message);
        setError('Failed to fetch restaurants');
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // 🔹 NEW: Prefill thông tin từ CustomerProfile
  useEffect(() => {
    const fetchCustomerProfileForOrder = async () => {
      try {
        const { data } = await api.get('/auth/profile/customer/me');

        if (!data) return;

        // Prefill tên & email nếu đang để trống
        setBillingDetails(prev => ({
          ...prev,
          name: prev.name || data.fullName || '',
          email: prev.email || data.email || '',
          address: {
            ...prev.address,
            line1: prev.address.line1 || data.address || ''
          }
        }));

        // Prefill address input
        if (!address && data.address) {
          setAddress(data.address);
        }

        // Lấy lat/lng từ profile (tuỳ bạn lưu dạng nào)
        const lat =
          typeof data.location?.lat === 'number'
            ? data.location.lat
            : data.location?.coordinates?.lat;
        const lng =
          typeof data.location?.lng === 'number'
            ? data.location.lng
            : data.location?.coordinates?.lng;

        if (
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          !deliveryLocation
        ) {
          setDeliveryLocation({
            latitude: lat,
            longitude: lng,
            address: data.address || ''
          });
        }
      } catch (e) {
        console.error(
          'Fetch customer profile for CreateOrder failed',
          e.response?.data || e.message
        );
      }
    };

    fetchCustomerProfileForOrder();
  }, []);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingPaymentMethods(true);
      try {
        const token = localStorage.getItem('token');
        const email = normalizeEmail(debouncedEmail);
        const name = (billingDetails.name || '').trim();
        // Chỉ gọi khi email HỢP LỆ và có name
        if (!email || !EMAIL_RE.test(email) || !name) return;

        console.log('Fetching payment methods with:', { email, name });
        const { data } = await api.post(
          `${PAYMENT_BASE}/customer`,
          { email, name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const cid = data.customerId;
        setCustomerId(cid);
        
        // (tuỳ chọn) gọi API để liệt kê thẻ đã lưu
        const pmRes = await api.get(
          `${PAYMENT_BASE}/payment-methods`,
          { params: { customerId: cid }, headers: { Authorization: `Bearer ${token}` } }
        );
        const methods = pmRes.data?.paymentMethods || [];
        setPaymentMethods(methods);
        if (methods.length === 0) console.log('No payment methods for this customer.');
      } catch (err) {
        console.error('Payment methods fetch error:', err.response?.data || err.message);
        // Không setError toàn cục ở đây để tránh “đỏ trang” khi user vẫn đang gõ.
      } finally {
        setLoadingPaymentMethods(false);
      }
    };
    fetchPaymentMethods();
  // phụ thuộc vào debouncedEmail   name (đã trim trong thân hàm)
  }, [debouncedEmail, billingDetails.name]);

  useEffect(() => {
    if (!selectedRestaurant) {
      setMenuItems([]);
      return;
    }

    const fetchMenuItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get(`${ORDER_BASE}/restaurant/${selectedRestaurant}/menu`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Fetched menu items:', response.data);
        setMenuItems(response.data);
      } catch (err) {
        setError('Failed to fetch menu items');
        console.error('Menu fetch error:', err);
      }
    };
    fetchMenuItems();
  }, [selectedRestaurant]);

  // Tự động tính tổng tiền món mỗi khi giỏ hàng hoặc nhà hàng thay đổi
  useEffect(() => {
    const sum = calculateItemsTotal();
    setItemsTotal(sum);
  }, [cart, selectedRestaurant]);

  // Tự động tính tiền ship mỗi khi vị trí giao hàng hoặc nhà hàng / danh sách nhà hàng thay đổi
  useEffect(() => {
    const fee = calculateShippingFee();
    setShippingFee(fee);
  }, [deliveryLocation, selectedRestaurant, restaurants]);

  const calculateItemsTotal = () => {
    const displayedCartItems = selectedRestaurant
      ? cart.filter(item => item.restaurantId === selectedRestaurant)
      : cart;
    const sum = displayedCartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    return sum;
  };

  const handleClearCartClick = () => {
    if (window.confirm('Bạn có chắc chắn muốn xoá hết giỏ hàng không?')) {
      clearCart();
    }
  };

  // Shipping fee in USD
  const calculateShippingFee = () => {
    if (!deliveryLocation || !selectedRestaurant) return 0;

    const restaurant = restaurants.find(r => r._id === selectedRestaurant);
    const coords = restaurant?.location?.coordinates || restaurant?.location;
    if (!coords?.lat || !coords?.lng) return 0;

    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km

    const dLat = toRad(deliveryLocation.latitude - coords.lat);
    const dLng = toRad(deliveryLocation.longitude - coords.lng);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(coords.lat)) *
        Math.cos(toRad(deliveryLocation.latitude)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Base: $2 + $0.5 / km
    const baseFee = 2;       // USD
    const feePerKm = 0.5;    // USD per km

    const rawFee = baseFee + distanceKm * feePerKm;

    // Round to 2 decimals (cents)
    return Number(rawFee.toFixed(2));
  };

  const openMapPicker = () => {
    setError('');
    setIsMapOpen(true);
  };

  const handleConfirmLocationFromMap = ({ lat, lng, address }) => {
    const coords = { latitude: lat, longitude: lng, address };
    setDeliveryLocation(coords);
    setAddress(address);
    setBillingDetails(prev => ({
      ...prev,
      address: {
        ...prev.address,
        line1: address
      }
    }));
    setIsMapOpen(false);
  };

  const initiatePayment = async () => {
    if (cart.length === 0 || !selectedRestaurant) {
      setError('Cart is empty or no restaurant selected');
      return;
    }

    const normalizedEmail = normalizeEmail(billingDetails.email);
    if (!billingDetails.name || !normalizedEmail || !EMAIL_RE.test(normalizedEmail) || !billingDetails.address.line1) {
      setError('Please provide complete billing details');
      return;
    }

    const itemsTotalLocal = itemsTotal;
    const shippingFeeLocal = shippingFee;
    const grandTotal = Number((itemsTotalLocal + shippingFeeLocal).toFixed(2));

    const displayedCartItems = selectedRestaurant
      ? cart.filter(item => item.restaurantId === selectedRestaurant)
      : cart;

    const newOrderData = {
      restaurantId: selectedRestaurant,
      items: displayedCartItems.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      itemsTotal: itemsTotalLocal,
      shippingFee: shippingFeeLocal,
      total: grandTotal,
      deliveryLocation,
      transportMode,
      customerContact: {
        fullName: customerContact.fullName || billingDetails.name,
        email: customerContact.email || normalizedEmail,
        phone: customerContact.phone || "",
        address:
          (deliveryLocation && deliveryLocation.address) ||
          customerContact.address ||
          address,
      },
    };

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        `${PAYMENT_BASE}/create-payment-intent`,
        {
          amount: grandTotal, // cents
          currency: 'usd',
          customerId,
          restaurantId: newOrderData.restaurantId,
          metadata: { restaurantId: newOrderData.restaurantId },
          billingDetails: {
            ...billingDetails,
            email: normalizedEmail,
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClientSecret(response.data.clientSecret);
      setOrderData(newOrderData);
      setShowPaymentModal(true);
    } catch (err) {
      setError('Failed to initialize payment');
      console.error('Payment initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
  setLoading(true);
  setError('');
  try {
    const token = localStorage.getItem('token');
    const orderResponse = await api.post(
      `${ORDER_BASE}/create`,
      {
        restaurantId: orderData.restaurantId,
        items: orderData.items,
        deliveryLocation: orderData.deliveryLocation,
        itemsTotal: orderData.itemsTotal,
        shippingFee: orderData.shippingFee,
        total: orderData.total,
        paymentIntentId,
        transportMode: orderData.transportMode,
        customerContact: orderData.customerContact,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );


   // Lấy orderId an toàn theo nhiều khả năng khác nhau
   const resp = orderResponse?.data ?? {};
   const orderId =
     resp.order?._id ||        // case A: { order: { _id, ... } }
     resp.orderId ||           // case B: { orderId: "..." }
     resp._id ||               // case C: { _id: "..." }
     resp.data?.order?._id ||  // case D: { data: { order: { _id } } }
     null;

   if (!orderId) {
     console.error('Unexpected /order/create response:', resp);
     setError('Đặt hàng thất bại: server không trả về orderId.');
     setLoading(false);
     return;
   }

   await api.post(
     `${PAYMENT_BASE}/update/${paymentIntentId}`,
     { orderId },
     { headers: { Authorization: `Bearer ${token}` } }
   );

    clearCart();
    setShowPaymentModal(false);
    navigate('/orders');
  } catch (err) {
   const serverMsg = err?.response?.data?.message || err.message || 'Failed to place order';
   setError(serverMsg);
   console.error('Order error:', serverMsg);
  } finally {
    setLoading(false);
  }
};


  const handlePaymentError = (err) => {
    setError(err.message || 'Payment failed');
    setLoading(false);
  };

  const displayedCartItems = selectedRestaurant
    ? cart.filter(item => item.restaurantId === selectedRestaurant)
    : cart;

  console.log('Displayed cart items:', displayedCartItems);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="bg-yellow-500 text-black p-4 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">FoodDelivery</h1>
          <nav className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 text-black font-medium hover:underline"
            >
              Home
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Create Order</h2>

        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-gray-900 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Select Restaurant</h3>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">-- Select a Restaurant --</option>
              {restaurants.map(restaurant => (
                <option key={restaurant._id} value={restaurant._id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold mb-4">Menu Items</h3>
            {selectedRestaurant ? (
              menuItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map(item => (
                    <div key={item._id} className="bg-gray-900 rounded-lg p-4 flex justify-between">
                      <div>
                        <h4 className="font-bold">{item.name}</h4>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                        <p className="text-yellow-500 mt-2">{formatCurrency(item.price)}</p>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-yellow-500 text-black px-3 py-1 rounded self-center hover:bg-yellow-600"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No menu items available for this restaurant.</p>
              )
            ) : (
              <p className="text-gray-400">Please select a restaurant to view menu items.</p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gray-900 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Delivery Location</h3>
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="flex-1 w-full">
              <AddressPicker
                value={address}
                onChangeAddress={(addr) => {
                  setAddress(addr);
                  setCustomerContact(prev => ({ ...prev, address: addr }));
                  setBillingDetails(prev => ({
                    ...prev,
                    address: { ...prev.address, line1: addr }
                  }));
                }}
                onChangeCoords={({ lat, lng, label }) => {
                  const addr = label || address;
                  setDeliveryLocation({
                    latitude: lat,
                    longitude: lng,
                    address: addr,
                  });
                  if (addr) {
                    setCustomerContact(prev => ({ ...prev, address: addr }));
                  }
                }}
              />
            </div>

            <button
              onClick={openMapPicker}
              className="px-4 py-3 mt-4 md:mt-8 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Use Current Location
            </button>
          </div>

          {deliveryLocation && (
            <div className="mt-4">
              <p className="text-green-500">✓ Location captured</p>
              <p className="text-sm text-gray-400">
                Lat: {deliveryLocation.latitude.toFixed(6)}, Lng:{" "}
                {deliveryLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Chọn phương thức giao hàng */}
        <div className="mb-4">
          <label className="block text-gray-400 mb-2">Phương thức giao hàng</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-gray-200">
              <input
                type="radio"
                name="transportMode"
                value="human"
                checked={transportMode === 'human'}
                onChange={() => setTransportMode('human')}
              />
              <span>Tài xế (delivery driver)</span>
            </label>
            <label className="flex items-center gap-2 text-gray-200">
              <input
                type="radio"
                name="transportMode"
                value="drone"
                checked={transportMode === 'drone'}
                onChange={() => setTransportMode('drone')}
              />
              <span>Drone tự động</span>
            </label>
          </div>
        </div>
          
        <div className="mt-8 bg-gray-900 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Billing Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-2">Full Name</label>
              <input
                type="text"
                value={billingDetails.name}
                onChange={(e) => setBillingDetails(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={billingDetails.email}
                onChange={(e) => setBillingDetails(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">City</label>
              <input
                type="text"
                value={billingDetails.address.city}
                onChange={(e) => setBillingDetails(prev => ({
                  ...prev,
                  address: { ...prev.address, city: e.target.value }
                }))}
                placeholder="Enter your city"
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">State</label>
              <input
                type="text"
                value={billingDetails.address.state}
                onChange={(e) => setBillingDetails(prev => ({
                  ...prev,
                  address: { ...prev.address, state: e.target.value }
                }))}
                placeholder="Enter your state"
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Postal Code</label>
              <input
                type="text"
                value={billingDetails.address.postal_code}
                onChange={(e) => setBillingDetails(prev => ({
                  ...prev,
                  address: { ...prev.address, postal_code: e.target.value }
                }))}
                placeholder="Enter your postal code"
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Country</label>
              <input
                type="text"
                value={billingDetails.address.country}
                onChange={(e) => setBillingDetails(prev => ({
                  ...prev,
                  address: { ...prev.address, country: e.target.value }
                }))}
                placeholder="Enter your country"
                className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 bg-gray-900 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Your Order</h3>
          {cart.length > 0 ? (
            <>
              {displayedCartItems.length === 0 && selectedRestaurant ? (
                <p className="text-yellow-500 mb-4">
                  No items in the cart match the selected restaurant. Please add items from this restaurant or change the selection.
                </p>
              ) : (
                <>
                  <div className="mb-6">
                    {displayedCartItems.map(item => (
                      <div
                        key={item.menuItemId || item._id}
                        className="flex justify-between items-center py-2 border-b border-gray-800"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-400">
                            {formatCurrency(item.price)} x {item.quantity}
                          </p>
                          <p className="text-sm text-gray-400">
                            Restaurant: {item.restaurantName}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => removeFromCart(item.menuItemId || item._id)}
                            className="bg-gray-800 text-white px-3 py-1 rounded mr-2 hover:bg-gray-700"
                          >
                            -
                          </button>
                          <span className="mx-2">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-gray-800 text-white px-3 py-1 rounded ml-2 hover:bg-gray-700"
                          >
                            +
                          </button>
                          <button
                            onClick={() => deleteFromCart(item.menuItemId || item._id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mb-6">
                    <button
                      onClick={handleClearCartClick}
                      className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white text-sm"
                    >
                      Xoá hết giỏ hàng
                    </button>
                  </div>
                </>
              )}

              <div className="space-y-1 mb-6 text-sm">
                <div className="flex justify-between">
                  <span>Items total</span>
                  <span>{formatCurrency(itemsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping fee</span>
                  <span>
                    {deliveryLocation
                      ? formatCurrency(shippingFee)
                      : 'Select or type delivery location'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center font-bold text-lg mb-6">
                <span>Total</span>
                <span className="text-yellow-500">
                  {formatCurrency(itemsTotal + (deliveryLocation ? shippingFee : 0))}
                </span>
              </div>
                  <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Payment Method</label>
                    {loadingPaymentMethods ? (
                      <p className="text-gray-400">Loading payment methods...</p>
                    ) : paymentMethods.length === 0 ? (
                      <p className="text-gray-400">No saved payment methods. Add a new one below.</p>
                    ) : (
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="w-full px-4 py-3 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="">Add new payment method</option>
                        {paymentMethods.map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.card.brand.toUpperCase()} ending in {pm.card.last4}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
              <button
                onClick={initiatePayment}
                disabled={
                  loading ||
                  displayedCartItems.length === 0 ||
                  !customerId ||
                  !billingDetails.name?.trim() ||
                  !EMAIL_RE.test(normalizeEmail(billingDetails.email)) ||
                  !billingDetails.address?.line1?.trim()
                }
                className={`w-full py-3 px-4 rounded font-medium bg-yellow-500 text-black hover:bg-yellow-600 transition duration-200 ${loading || displayedCartItems.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </>
          ) : (
            <p className="text-gray-400">Your cart is empty. Add items from the menu to place an order.</p>
          )}
        </div>

        {showPaymentModal && clientSecret && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md relative">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-2 right-2 text-white hover:text-yellow-500"
              >
                ✕
              </button>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  setLoading={setLoading}
                  selectedPaymentMethod={selectedPaymentMethod}
                  billingDetails={billingDetails}
                  clientSecret={clientSecret}
                />
              </Elements>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-white text-center py-4">
        <p>© {new Date().getFullYear()} Eatzaa. All rights reserved.</p>
      </footer>
      <MapPicker
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirm={handleConfirmLocationFromMap}
        initialLocation={
          deliveryLocation
            ? { lat: deliveryLocation.latitude, lng: deliveryLocation.longitude }
            : null
        }
      />

    </div>
  );
};

export default CreateOrder;