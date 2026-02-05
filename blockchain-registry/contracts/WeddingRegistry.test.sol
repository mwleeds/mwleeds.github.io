// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./WeddingRegistry.sol";

/**
 * @title WeddingRegistryTest
 * @notice Test suite for WeddingRegistry contract
 * @dev Run with: forge test -vv
 */
contract WeddingRegistryTest is Test {
    WeddingRegistry public registry;
    address public owner;
    address public guest;

    function setUp() public {
        owner = address(this);
        guest = address(0x1234);
        registry = new WeddingRegistry();
    }

    function testOwnerIsSetCorrectly() public {
        assertEq(registry.owner(), owner);
    }

    function testAddItem() public {
        registry.addItem(
            "Coffee Maker",
            "12-cup programmable coffee maker",
            "https://example.com/coffee-maker",
            "https://example.com/images/coffee.jpg"
        );

        assertEq(registry.getItemCount(), 1);

        WeddingRegistry.RegistryItem memory item = registry.getItem(0);
        assertEq(item.name, "Coffee Maker");
        assertEq(item.description, "12-cup programmable coffee maker");
        assertEq(item.url, "https://example.com/coffee-maker");
        assertEq(item.imageUrl, "https://example.com/images/coffee.jpg");
        assertEq(item.isPurchased, false);
    }

    function testOnlyOwnerCanAddItem() public {
        vm.prank(guest);
        vm.expectRevert("Only owner can call this function");
        registry.addItem("Item", "Description", "url", "imageUrl");
    }

    function testMarkAsPurchased() public {
        // Add an item
        registry.addItem(
            "Blender",
            "High-speed blender",
            "https://example.com/blender",
            "https://example.com/images/blender.jpg"
        );

        // Mark as purchased (anyone can do this via relayer)
        vm.prank(guest);
        registry.markAsPurchased(0, "encrypted_name_here");

        WeddingRegistry.RegistryItem memory item = registry.getItem(0);
        assertTrue(item.isPurchased);
        assertEq(item.encryptedPurchaserName, "encrypted_name_here");
        assertGt(item.purchasedAt, 0);
    }

    function testCannotPurchaseTwice() public {
        registry.addItem("Toaster", "2-slice toaster", "url", "imageUrl");

        registry.markAsPurchased(0, "first_purchaser");

        vm.expectRevert("Item already purchased");
        registry.markAsPurchased(0, "second_purchaser");
    }

    function testRequiresPurchaserName() public {
        registry.addItem("Plates", "Dinner plate set", "url", "imageUrl");

        vm.expectRevert("Purchaser name required");
        registry.markAsPurchased(0, "");
    }

    function testUpdateItem() public {
        registry.addItem("Item 1", "Desc 1", "url1", "img1");

        registry.updateItem(0, "Item 1 Updated", "New Description", "url2", "img2");

        WeddingRegistry.RegistryItem memory item = registry.getItem(0);
        assertEq(item.name, "Item 1 Updated");
        assertEq(item.description, "New Description");
        assertEq(item.url, "url2");
        assertEq(item.imageUrl, "img2");
    }

    function testOnlyOwnerCanUpdateItem() public {
        registry.addItem("Item", "Desc", "url", "img");

        vm.prank(guest);
        vm.expectRevert("Only owner can call this function");
        registry.updateItem(0, "New Name", "New Desc", "url", "img");
    }

    function testResetItem() public {
        registry.addItem("Glasses", "Wine glasses", "url", "img");
        registry.markAsPurchased(0, "encrypted_name");

        // Owner can reset
        registry.resetItem(0);

        WeddingRegistry.RegistryItem memory item = registry.getItem(0);
        assertFalse(item.isPurchased);
        assertEq(item.encryptedPurchaserName, "");
        assertEq(item.purchasedAt, 0);
    }

    function testOnlyOwnerCanResetItem() public {
        registry.addItem("Item", "Desc", "url", "img");
        registry.markAsPurchased(0, "encrypted");

        vm.prank(guest);
        vm.expectRevert("Only owner can call this function");
        registry.resetItem(0);
    }

    function testRemoveItem() public {
        registry.addItem("Item 1", "Desc 1", "url1", "img1");
        registry.addItem("Item 2", "Desc 2", "url2", "img2");
        registry.addItem("Item 3", "Desc 3", "url3", "img3");

        assertEq(registry.getItemCount(), 3);

        // Remove middle item (soft delete)
        registry.removeItem(1);

        // Count should be 2 (excludes deleted)
        assertEq(registry.getItemCount(), 2);

        // But item still exists at index 1 (soft deleted)
        WeddingRegistry.RegistryItem memory item = registry.getItem(1);
        assertTrue(item.isDeleted);
        assertEq(item.name, "Item 2"); // Data still there
    }

    function testCannotRemoveAlreadyDeletedItem() public {
        registry.addItem("Item", "Desc", "url", "img");
        registry.removeItem(0);

        vm.expectRevert("Item already deleted");
        registry.removeItem(0);
    }

    function testCannotUpdateDeletedItem() public {
        registry.addItem("Item", "Desc", "url", "img");
        registry.removeItem(0);

        vm.expectRevert("Cannot update deleted item");
        registry.updateItem(0, "New Name", "New Desc", "url", "img");
    }

    function testCannotPurchaseDeletedItem() public {
        registry.addItem("Item", "Desc", "url", "img");
        registry.removeItem(0);

        vm.expectRevert("Item has been removed");
        registry.markAsPurchased(0, "encrypted_name");
    }

    function testCannotResetDeletedItem() public {
        registry.addItem("Item", "Desc", "url", "img");
        registry.markAsPurchased(0, "encrypted");
        registry.removeItem(0);

        vm.expectRevert("Cannot reset deleted item");
        registry.resetItem(0);
    }

    function testOnlyOwnerCanRemoveItem() public {
        registry.addItem("Item", "Desc", "url", "img");

        vm.prank(guest);
        vm.expectRevert("Only owner can call this function");
        registry.removeItem(0);
    }

    function testGetAllItems() public {
        registry.addItem("Item 1", "Desc 1", "url1", "img1");
        registry.addItem("Item 2", "Desc 2", "url2", "img2");
        registry.addItem("Item 3", "Desc 3", "url3", "img3");

        // Remove one item
        registry.removeItem(1);

        // getAllItems should only return non-deleted items
        WeddingRegistry.RegistryItem[] memory items = registry.getAllItems();
        assertEq(items.length, 2);
        assertEq(items[0].name, "Item 1");
        assertEq(items[1].name, "Item 3");
    }

    function testGetAvailableItems() public {
        registry.addItem("Item 1", "Desc 1", "url1", "img1");
        registry.addItem("Item 2", "Desc 2", "url2", "img2");
        registry.addItem("Item 3", "Desc 3", "url3", "img3");
        registry.addItem("Item 4", "Desc 4", "url4", "img4");

        // Mark item 1 as purchased
        registry.markAsPurchased(1, "encrypted_name");

        // Delete item 2
        registry.removeItem(2);

        // Should only show items that are not purchased AND not deleted
        WeddingRegistry.RegistryItem[] memory available = registry.getAvailableItems();
        assertEq(available.length, 2); // Item 0 and Item 3
    }

    function testGetPurchasedItems() public {
        registry.addItem("Item 1", "Desc 1", "url1", "img1");
        registry.addItem("Item 2", "Desc 2", "url2", "img2");
        registry.addItem("Item 3", "Desc 3", "url3", "img3");
        registry.addItem("Item 4", "Desc 4", "url4", "img4");

        registry.markAsPurchased(0, "name1");
        registry.markAsPurchased(2, "name2");
        registry.markAsPurchased(3, "name3");

        // Delete one purchased item
        registry.removeItem(2);

        // Should only return purchased items that aren't deleted
        WeddingRegistry.RegistryItem[] memory purchased = registry.getPurchasedItems();
        assertEq(purchased.length, 2); // Item 0 and Item 3
    }

    function testTransferOwnership() public {
        address newOwner = address(0x5678);

        registry.transferOwnership(newOwner);

        assertEq(registry.owner(), newOwner);
    }

    function testOnlyOwnerCanTransferOwnership() public {
        address newOwner = address(0x5678);

        vm.prank(guest);
        vm.expectRevert("Only owner can call this function");
        registry.transferOwnership(newOwner);
    }

    function testCannotTransferToZeroAddress() public {
        vm.expectRevert("New owner cannot be zero address");
        registry.transferOwnership(address(0));
    }

    function testInvalidItemId() public {
        vm.expectRevert("Invalid item ID");
        registry.getItem(999);
    }
}
