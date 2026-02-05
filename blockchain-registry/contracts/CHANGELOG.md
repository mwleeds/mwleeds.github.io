# WeddingRegistry Contract Changelog

## Soft Delete Implementation (isDeleted flag)

### Changes Made

**Added `isDeleted` flag to RegistryItem struct:**
```solidity
struct RegistryItem {
    string name;
    string description;
    string url;
    string imageUrl;
    bool isPurchased;
    bool isDeleted;  // NEW - soft delete flag
    string encryptedPurchaserName;
    uint256 purchasedAt;
}
```

### Updated Functions

#### `removeItem(uint256 itemId)`
**Before:** Swapped with last item and popped from array (changed indices)
**After:** Sets `isDeleted = true` (indices stay stable)

```solidity
// Old implementation (unstable indices)
items[itemId] = items[items.length - 1];
items.pop();

// New implementation (stable indices)
items[itemId].isDeleted = true;
```

#### View Functions (filter out deleted items)
All view functions now exclude deleted items:

- `getAllItems()` - Returns only non-deleted items
- `getAvailableItems()` - Returns non-deleted AND non-purchased items
- `getPurchasedItems()` - Returns purchased items that aren't deleted
- `getItemCount()` - Counts only non-deleted items

#### Write Functions (prevent operations on deleted items)
Added validation to prevent operations on deleted items:

- `updateItem()` - Cannot update deleted items
- `markAsPurchased()` - Cannot purchase deleted items
- `resetItem()` - Cannot reset deleted items

### Benefits

**1. Stable Indices**
```javascript
// Before: If you had items [0, 1, 2] and removed item 1,
// item 2 would become item 1 (index changed!)

// After: Items stay at their original indices
// Item 1 is just marked as deleted
```

**2. Frontend Simplicity**
```javascript
// Frontend can reliably reference items by ID
const itemId = 5;
// This will always refer to the same item, even if others are deleted
```

**3. Data Preservation**
```javascript
// Deleted items still exist in storage (can be audited/restored)
// Useful for debugging or if you accidentally delete something
```

**4. Simpler Lambda Integration**
```javascript
// When relayer calls markAsPurchased(itemId, encryptedName),
// itemId is guaranteed to stay the same throughout the wedding
```

### Tradeoffs

**Gas Cost:**
- View functions are slightly more expensive (need to filter)
- BUT Base L2 gas is very cheap (~$0.01 per transaction)
- For a wedding registry (small scale), this is negligible

**Storage:**
- Deleted items remain in storage
- BUT you're unlikely to delete many items
- Storage on L2 is cheap

**Net Result:** Better user experience with minimal cost impact

### Testing

All tests updated to cover new functionality:

```bash
cd contracts
forge test -vv
```

Tests include:
- Soft delete behavior
- Cannot remove already deleted items
- Cannot update/purchase/reset deleted items
- View functions filter deleted items correctly
- Item counts exclude deleted items

### Migration

**If you already deployed the contract:**
- You'll need to redeploy with the updated version
- The struct layout changed (added `isDeleted` field)
- Any existing deployed contracts won't have this field

**If you haven't deployed yet:**
- You're good to go! Deploy the updated version

### Example Usage

```solidity
// Add items
addItem("Coffee Maker", "Description", "url", "imageUrl");  // itemId = 0
addItem("Blender", "Description", "url", "imageUrl");       // itemId = 1
addItem("Toaster", "Description", "url", "imageUrl");       // itemId = 2

// Remove middle item
removeItem(1);

// getItemCount() returns 2 (excludes deleted)
// getAllItems() returns [item 0, item 2]
// Item 1 still exists at index 1, just marked as deleted

// Frontend can still reference itemId=0 and itemId=2 consistently
```

### Recommendation

✅ **Use this version for deployment**

The stable indices make the system much more robust, especially when:
- Multiple people are browsing/purchasing simultaneously
- You need to add/remove items during the wedding
- Frontend needs to maintain consistent item references
- You want to audit or restore deleted items later

The minimal gas cost increase is worth the improved reliability.
