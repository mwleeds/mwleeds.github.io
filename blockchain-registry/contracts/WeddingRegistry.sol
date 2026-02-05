// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WeddingRegistry
 * @notice A smart contract for managing a wedding gift registry on Base L2
 * @dev Items can be added by owner, marked as purchased by anyone (via relayer)
 *      Purchase status is public, but purchaser info is encrypted
 */
contract WeddingRegistry {

    struct RegistryItem {
        string name;
        string description;
        string url;
        string imageUrl;
        bool isPurchased;
        bool isDeleted; // Soft delete flag - keeps indices stable
        string encryptedPurchaserName; // Encrypted with owner's public key
        uint256 purchasedAt; // Timestamp when purchased
    }

    address public owner;
    RegistryItem[] public items;

    event ItemAdded(uint256 indexed itemId, string name);
    event ItemUpdated(uint256 indexed itemId, string name);
    event ItemRemoved(uint256 indexed itemId);
    event ItemPurchased(uint256 indexed itemId, uint256 timestamp);
    event ItemResetByOwner(uint256 indexed itemId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validItemId(uint256 itemId) {
        require(itemId < items.length, "Invalid item ID");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Add a new item to the registry
     * @param name Item name
     * @param description Item description
     * @param url Link to the item (store URL, product page, etc.)
     * @param imageUrl URL to item image
     */
    function addItem(
        string memory name,
        string memory description,
        string memory url,
        string memory imageUrl
    ) external onlyOwner {
        RegistryItem memory newItem = RegistryItem({
            name: name,
            description: description,
            url: url,
            imageUrl: imageUrl,
            isPurchased: false,
            isDeleted: false,
            encryptedPurchaserName: "",
            purchasedAt: 0
        });

        items.push(newItem);
        emit ItemAdded(items.length - 1, name);
    }

    /**
     * @notice Update an existing item
     * @param itemId ID of the item to update
     * @param name New item name
     * @param description New item description
     * @param url New URL
     * @param imageUrl New image URL
     */
    function updateItem(
        uint256 itemId,
        string memory name,
        string memory description,
        string memory url,
        string memory imageUrl
    ) external onlyOwner validItemId(itemId) {
        RegistryItem storage item = items[itemId];
        require(!item.isDeleted, "Cannot update deleted item");

        item.name = name;
        item.description = description;
        item.url = url;
        item.imageUrl = imageUrl;

        emit ItemUpdated(itemId, name);
    }

    /**
     * @notice Remove an item from the registry (soft delete)
     * @dev Sets isDeleted flag - keeps item indices stable
     * @param itemId ID of the item to remove
     */
    function removeItem(uint256 itemId) external onlyOwner validItemId(itemId) {
        require(!items[itemId].isDeleted, "Item already deleted");
        items[itemId].isDeleted = true;
        emit ItemRemoved(itemId);
    }

    /**
     * @notice Mark an item as purchased
     * @dev This will be called by the relayer backend with encrypted purchaser name
     * @param itemId ID of the item to mark as purchased
     * @param encryptedPurchaserName Purchaser's name encrypted with owner's public key
     */
    function markAsPurchased(
        uint256 itemId,
        string memory encryptedPurchaserName
    ) external validItemId(itemId) {
        RegistryItem storage item = items[itemId];
        require(!item.isDeleted, "Item has been removed");
        require(!item.isPurchased, "Item already purchased");
        require(bytes(encryptedPurchaserName).length > 0, "Purchaser name required");

        item.isPurchased = true;
        item.encryptedPurchaserName = encryptedPurchaserName;
        item.purchasedAt = block.timestamp;

        emit ItemPurchased(itemId, block.timestamp);
    }

    /**
     * @notice Reset an item to unpurchased state (owner only)
     * @dev Useful for handling mistakes or cancellations
     * @param itemId ID of the item to reset
     */
    function resetItem(uint256 itemId) external onlyOwner validItemId(itemId) {
        RegistryItem storage item = items[itemId];
        require(!item.isDeleted, "Cannot reset deleted item");

        item.isPurchased = false;
        item.encryptedPurchaserName = "";
        item.purchasedAt = 0;

        emit ItemResetByOwner(itemId);
    }

    /**
     * @notice Get total number of active (non-deleted) items in registry
     */
    function getItemCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Get all active (non-deleted) items
     * @dev Returns array of all registry items that haven't been deleted
     */
    function getAllItems() external view returns (RegistryItem[] memory) {
        uint256 activeCount = 0;

        // Count active items
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted) {
                activeCount++;
            }
        }

        // Create array of active items
        RegistryItem[] memory activeItems = new RegistryItem[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted) {
                activeItems[currentIndex] = items[i];
                currentIndex++;
            }
        }

        return activeItems;
    }

    /**
     * @notice Get a specific item by ID
     */
    function getItem(uint256 itemId) external view validItemId(itemId) returns (RegistryItem memory) {
        return items[itemId];
    }

    /**
     * @notice Get only available (unpurchased, non-deleted) items
     */
    function getAvailableItems() external view returns (RegistryItem[] memory) {
        uint256 availableCount = 0;

        // Count available items
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted && !items[i].isPurchased) {
                availableCount++;
            }
        }

        // Create array of available items
        RegistryItem[] memory availableItems = new RegistryItem[](availableCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted && !items[i].isPurchased) {
                availableItems[currentIndex] = items[i];
                currentIndex++;
            }
        }

        return availableItems;
    }

    /**
     * @notice Get only purchased (non-deleted) items (for owner to see who bought what)
     */
    function getPurchasedItems() external view returns (RegistryItem[] memory) {
        uint256 purchasedCount = 0;

        // Count purchased items
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted && items[i].isPurchased) {
                purchasedCount++;
            }
        }

        // Create array of purchased items
        RegistryItem[] memory purchasedItems = new RegistryItem[](purchasedCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].isDeleted && items[i].isPurchased) {
                purchasedItems[currentIndex] = items[i];
                currentIndex++;
            }
        }

        return purchasedItems;
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
