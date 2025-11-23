import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, Save, ArrowLeft, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import CateringMenuSelection from './CateringMenuSelection';
import CateringOrderSummary from './CateringOrderSummary';
import PaymentModal from './PaymentModal';
import useCateringMenu from '@/hooks/useCateringMenu';
import cateringService from '@/api/services/cateringService';
import FeaturePanelCard from '@/components/shared/FeaturePanelCard';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const CateringMenuPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { categorizedMenu, isLoading, error, refetch } = useCateringMenu();

  const [event, setEvent] = useState(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState('fixed');
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobileOrderSheetOpen, setIsMobileOrderSheetOpen] = useState(false);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      setIsLoadingEvent(true);
      try {
        const res = await cateringService.getEvent(eventId, {
          includeItems: true,
        });
        if (!res?.success) throw new Error(res?.message);
        setEvent(res.data);

        // Initialize selected items from event data
        if (res.data?.items) {
          const itemsMap = {};
          res.data.items.forEach((item) => {
            itemsMap[item.menuItemId || item.id] = {
              id: item.menuItemId || item.id,
              name: item.name,
              price: item.unitPrice || 0,
              quantity: item.quantity || 1,
              category: '',
            };
          });
          setSelectedItems(itemsMap);
        }

        // Initialize discount
        if (res.data?.orderDiscount) {
          setDiscount(String(res.data.orderDiscount));
          setDiscountType('fixed');
        }
      } catch (err) {
        const message =
          err?.message ||
          err?.details?.message ||
          'Failed to load event details';
        toast.error(message);
        navigate('/catering');
      } finally {
        setIsLoadingEvent(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const handleAddToOrder = useCallback((item) => {
    setSelectedItems((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: {
            ...existing,
            quantity: existing.quantity + 1,
          },
        };
      }
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          category: item.category || '',
        },
      };
    });
  }, []);

  const handleUpdateQuantity = useCallback((itemId, newQuantity) => {
    setSelectedItems((prev) => {
      const item = prev[itemId];
      if (!item) return prev;
      return {
        ...prev,
        [itemId]: {
          ...item,
          quantity: Math.max(1, newQuantity),
        },
      };
    });
  }, []);

  const handleRemoveItem = useCallback((itemId) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      delete newItems[itemId];
      return newItems;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (
      Object.keys(selectedItems).length > 0 &&
      !confirm('Are you sure you want to clear all items from the order?')
    ) {
      return;
    }
    setSelectedItems({});
    setDiscount('0');
  }, [selectedItems]);

  const handleSaveOrder = async () => {
    if (!eventId) {
      toast.error('No event selected');
      return;
    }

    const itemsArray = Object.values(selectedItems);
    if (itemsArray.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    setIsSaving(true);
    try {
      const items = itemsArray.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const response = await cateringService.setEventMenuItems(eventId, items);

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to save menu items');
      }

      // Update discount if changed
      const discountValue = Number(discount) || 0;
      if (discountValue !== (event?.orderDiscount || 0)) {
        await cateringService.updateEvent(eventId, {
          orderDiscount: discountValue,
        });
      }

      toast.success('Catering order saved successfully!');
      navigate('/catering');
    } catch (err) {
      const message =
        err?.message ||
        err?.details?.message ||
        'Failed to save catering order';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const itemCount = useMemo(() => {
    return Object.keys(selectedItems).length;
  }, [selectedItems]);

  const handlePaymentSubmit = async (paymentData) => {
    try {
      const response = await cateringService.submitPayment(eventId, {
        paymentType: paymentData.paymentType,
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Payment processing failed');
      }

      toast.success('Payment processed successfully!');
      setShowPaymentModal(false);

      // Refresh event data to show updated payment status
      const res = await cateringService.getEvent(eventId, {
        includeItems: true,
      });
      if (res?.success) {
        setEvent(res.data);
      }

      // Navigate back to catering page
      setTimeout(() => {
        navigate('/catering');
      }, 1000);
    } catch (err) {
      const message =
        err?.message || err?.details?.message || 'Failed to process payment';
      toast.error(message);
      throw err;
    }
  };

  if (isLoadingEvent || !event) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Header Card */}
      <FeaturePanelCard
        title={`Catering Menu - ${event.name || event.clientName}`}
        description={`${event.client || event.clientName} • ${event.attendees || event.guestCount} attendees`}
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/catering')}
              disabled={isSaving}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <button
              type="button"
              onClick={() => setIsMobileOrderSheetOpen(true)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
              aria-label={
                itemCount > 0
                  ? `View selected items (${itemCount})`
                  : 'View selected items'
              }
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-h-[1.1rem] min-w-[1.1rem] rounded-full bg-destructive px-1 text-[11px] font-semibold leading-[1.1rem] text-destructive-foreground">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Menu Selection */}
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading menu...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={refetch} variant="outline">
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <CateringMenuSelection
                categories={categorizedMenu}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAddToOrder={handleAddToOrder}
                eventName={event.name || event.clientName}
                attendees={event.attendees || event.guestCount}
              />
            )}
          </div>

          {/* Right Panel: Order Summary */}
          <div className="hidden lg:block">
            <CateringOrderSummary
              selectedItems={selectedItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearAll={handleClearAll}
              discount={discount}
              discountType={discountType}
              onDiscountChange={setDiscount}
              onDiscountTypeChange={setDiscountType}
              canProcessPayment={Boolean(event?.estimatedTotal || event?.total)}
              onProcessPayment={() => setShowPaymentModal(true)}
              onSaveOrder={handleSaveOrder}
              isSaving={isSaving}
              itemCount={itemCount}
            />
          </div>
        </div>
      </FeaturePanelCard>

      <Sheet
        open={isMobileOrderSheetOpen}
        onOpenChange={setIsMobileOrderSheetOpen}
      >
        <SheetContent
          side="bottom"
          className="flex h-[88vh] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-background/95 p-0 lg:hidden"
        >
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-base font-semibold text-foreground">
                Catering Order Summary
              </SheetTitle>
              <SheetDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {event.name || event.clientName} -{' '}
                {event.attendees || event.guestCount} attendees
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <CateringOrderSummary
              selectedItems={selectedItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearAll={handleClearAll}
              discount={discount}
              discountType={discountType}
              onDiscountChange={setDiscount}
              onDiscountTypeChange={setDiscountType}
              canProcessPayment={Boolean(event?.estimatedTotal || event?.total)}
              onProcessPayment={() => {
                setIsMobileOrderSheetOpen(false);
                setShowPaymentModal(true);
              }}
              onSaveOrder={handleSaveOrder}
              isSaving={isSaving}
              itemCount={itemCount}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        event={event}
        onPaymentSubmit={handlePaymentSubmit}
      />
    </div>
  );
};

export default CateringMenuPage;
