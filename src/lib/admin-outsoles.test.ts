import { describe, it, expect, mock } from "bun:test";
import { executePermanentDeletion } from "./admin-outsoles.functions";
import { z } from "zod";

describe("Product Selection and Bulk State Logic", () => {
  const mockProducts = [
    { id: "uuid-1", name: "Apex Grip", status: "active", slug: "apex-grip" },
    { id: "uuid-2", name: "Trail Runner", status: "archived", slug: "trail-runner" },
    { id: "uuid-3", name: "City Walker", status: "draft", slug: "city-walker" },
    { id: "uuid-4", name: "Summit Pro", status: "archived", slug: "summit-pro" },
  ];

  it("calculates select-all and indeterminate state accurately for full, partial, and empty selections", () => {
    const displayedIds = mockProducts.map((p) => p.id);

    // Empty selection
    const emptySelected = new Set<string>();
    const countEmpty = displayedIds.filter((id) => emptySelected.has(id)).length;
    const isAllSelectedEmpty = displayedIds.length > 0 && countEmpty === displayedIds.length;
    const isIndeterminateEmpty = countEmpty > 0 && countEmpty < displayedIds.length;

    expect(isAllSelectedEmpty).toBe(false);
    expect(isIndeterminateEmpty).toBe(false);

    // Partial selection (1 of 4)
    const partialSelected = new Set(["uuid-1"]);
    const countPartial = displayedIds.filter((id) => partialSelected.has(id)).length;
    const isAllSelectedPartial = displayedIds.length > 0 && countPartial === displayedIds.length;
    const isIndeterminatePartial = countPartial > 0 && countPartial < displayedIds.length;

    expect(isAllSelectedPartial).toBe(false);
    expect(isIndeterminatePartial).toBe(true);

    // Full selection (4 of 4)
    const fullSelected = new Set(["uuid-1", "uuid-2", "uuid-3", "uuid-4"]);
    const countFull = displayedIds.filter((id) => fullSelected.has(id)).length;
    const isAllSelectedFull = displayedIds.length > 0 && countFull === displayedIds.length;
    const isIndeterminateFull = countFull > 0 && countFull < displayedIds.length;

    expect(isAllSelectedFull).toBe(true);
    expect(isIndeterminateFull).toBe(false);
  });

  it("select-all operates strictly on filtered result set without selecting hidden products", () => {
    // User filters by status = 'archived'
    const filteredProducts = mockProducts.filter((p) => p.status === "archived");
    const displayedIds = filteredProducts.map((p) => p.id);
    expect(displayedIds).toEqual(["uuid-2", "uuid-4"]);

    // Toggle select-all on filtered view
    const selectedIds = new Set<string>();
    displayedIds.forEach((id) => selectedIds.add(id));

    expect(selectedIds.has("uuid-2")).toBe(true);
    expect(selectedIds.has("uuid-4")).toBe(true);
    // Active and draft items must not be selected
    expect(selectedIds.has("uuid-1")).toBe(false);
    expect(selectedIds.has("uuid-3")).toBe(false);
  });

  it("prunes stale selections when the dataset reloads or items are removed", () => {
    const previousSelected = new Set(["uuid-1", "uuid-2", "uuid-deleted"]);
    const currentProducts = mockProducts; // contains uuid-1, uuid-2, uuid-3, uuid-4
    const validIds = new Set(currentProducts.map((p) => p.id));

    const pruned = new Set([...previousSelected].filter((id) => validIds.has(id)));
    expect(pruned.has("uuid-1")).toBe(true);
    expect(pruned.has("uuid-2")).toBe(true);
    expect(pruned.has("uuid-deleted")).toBe(false);
    expect(pruned.size).toBe(2);
  });

  it("accurately categorizes selected items for bulk archive, restore, and delete", () => {
    const selectedItems = [
      { id: "1", name: "Item 1", status: "active" },
      { id: "2", name: "Item 2", status: "draft" },
      { id: "3", name: "Item 3", status: "archived" },
      { id: "4", name: "Item 4", status: "archived" },
    ];

    const eligibleArchive = selectedItems.filter((i) => i.status !== "archived");
    const eligibleRestore = selectedItems.filter((i) => i.status === "archived");
    const eligibleDelete = selectedItems.filter((i) => i.status === "archived");
    const ineligibleDelete = selectedItems.filter((i) => i.status !== "archived");

    expect(eligibleArchive.map((i) => i.id)).toEqual(["1", "2"]);
    expect(eligibleRestore.map((i) => i.id)).toEqual(["3", "4"]);
    expect(eligibleDelete.map((i) => i.id)).toEqual(["3", "4"]);
    expect(ineligibleDelete.map((i) => i.id)).toEqual(["1", "2"]);
  });
});

describe("H-1: Storage files belonging to products that still exist are never deleted", () => {
  it("rejects permanent deletion of active or draft products before database queries", async () => {
    const mockSupabase = {
      from: mock(() => ({
        select: mock(() => ({ in: mock(() => Promise.resolve({ data: [] })) })),
        delete: mock(() => ({
          in: mock(() => ({ eq: mock(() => Promise.resolve({ data: [] })) })),
        })),
      })),
      storage: {
        from: mock(() => ({ remove: mock(() => Promise.resolve({ error: null })) })),
      },
    };

    const mixedProducts = [
      { id: "p1", name: "Active Sole", model_number: "ACT-01", status: "active" },
      { id: "p2", name: "Draft Sole", model_number: "DFT-01", status: "draft" },
    ];

    const result = await executePermanentDeletion(mockSupabase, mixedProducts);

    expect(result.deleted.length).toBe(0);
    expect(result.rejected.length).toBe(2);
    expect(result.rejected[0]?.reason).toContain("Product must be archived first");
    expect(result.rejected[1]?.reason).toContain("Product must be archived first");
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("handles a product changing from archived to active concurrently before DELETE", async () => {
    // Initial status passed to deletion was 'archived', but when DELETE ... WHERE status='archived' runs,
    // it matches 0 rows because the row became 'active' concurrently.
    const storageRemovedPaths: string[] = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "img-1",
                      outsole_id: "p-concurrent",
                      file_path: "outsoles/p-concurrent/img.webp",
                    },
                  ],
                  error: null,
                }),
            }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () => Promise.resolve({ data: [], error: null }), // 0 rows deleted in DB!
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: (paths: string[]) => {
            storageRemovedPaths.push(...paths);
            return Promise.resolve({ data: paths, error: null });
          },
        }),
      },
    };

    const products = [
      { id: "p-concurrent", name: "Concurrent Sole", model_number: "CS-01", status: "archived" },
    ];
    const result = await executePermanentDeletion(mockSupabase, products);

    expect(result.deleted.length).toBe(0);
    expect(result.rejected.length).toBe(1);
    expect(result.rejected[0]?.reason).toContain("Product was not deleted from database");
    // CRITICAL: Storage deletion MUST NOT be called!
    expect(storageRemovedPaths.length).toBe(0);
  });

  it("handles DELETE returning fewer rows than requested and only cleans up deleted product images", async () => {
    // 2 archived products: p1 (has img1) and p2 (has img2).
    // Database only deletes p1 (p2 fails status condition or row lock).
    const storageRemovedPaths: string[] = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: (col: string) => {
                if (col === "outsole_id") {
                  return Promise.resolve({
                    data: [
                      { id: "img-1", outsole_id: "p1", file_path: "outsoles/p1/img1.webp" },
                      { id: "img-2", outsole_id: "p2", file_path: "outsoles/p2/img2.webp" },
                    ],
                    error: null,
                  });
                }
                if (col === "file_path") {
                  // Surviving outsole_images check after DB delete (p2's images still exist, but we only check p1's!)
                  return Promise.resolve({ data: [], error: null });
                }
                return Promise.resolve({ data: [], error: null });
              },
            }),
          };
        }
        if (table === "factory_gallery" || table === "factory_info_rows") {
          return {
            select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    // Only p1 was actually deleted by the database!
                    Promise.resolve({
                      data: [{ id: "p1", name: "Sole 1", model_number: "S1" }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: (paths: string[]) => {
            storageRemovedPaths.push(...paths);
            return Promise.resolve({ data: paths, error: null });
          },
        }),
      },
    };

    const products = [
      { id: "p1", name: "Sole 1", model_number: "S1", status: "archived" },
      { id: "p2", name: "Sole 2", model_number: "S2", status: "archived" },
    ];

    const result = await executePermanentDeletion(mockSupabase, products);

    expect(result.deleted.length).toBe(1);
    expect(result.deleted[0]?.id).toBe("p1");
    expect(result.rejected.length).toBe(1);
    expect(result.rejected[0]?.id).toBe("p2");

    // H-1: Only p1's image is considered; p2's image MUST NOT be deleted from Storage!
    expect(storageRemovedPaths).toEqual(["outsoles/p1/img1.webp"]);
  });

  it("performs no Storage deletion if database DELETE query returns an error", async () => {
    let storageRemoveCalled = false;

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [{ id: "img-1", outsole_id: "p1", file_path: "outsoles/p1/img.webp" }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    Promise.resolve({
                      data: null,
                      error: { message: "Database connection terminated during delete" },
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: () => {
            storageRemoveCalled = true;
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    };

    const products = [{ id: "p1", name: "Sole", model_number: "S1", status: "archived" }];
    await expect(executePermanentDeletion(mockSupabase, products)).rejects.toThrow(
      "Database permanent deletion failed: Database connection terminated during delete",
    );
    expect(storageRemoveCalled).toBe(false);
  });
});

describe("H-2: Fail closed when checking shared image references", () => {
  it("fails closed and skips Storage removal if outsole_images reference check query fails", async () => {
    let storageRemoveCalled = false;

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: (col: string) => {
                if (col === "outsole_id") {
                  return Promise.resolve({
                    data: [{ id: "img-1", outsole_id: "p1", file_path: "outsoles/p1/img.webp" }],
                    error: null,
                  });
                }
                if (col === "file_path") {
                  // Reference check query fails!
                  return Promise.resolve({
                    data: null,
                    error: { message: "Query timeout checking surviving outsole_images" },
                  });
                }
                return Promise.resolve({ data: [], error: null });
              },
            }),
          };
        }
        if (table === "factory_gallery" || table === "factory_info_rows") {
          return {
            select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    Promise.resolve({
                      data: [{ id: "p1", name: "Sole", model_number: "S1" }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: () => {
            storageRemoveCalled = true;
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    };

    const products = [{ id: "p1", name: "Sole", model_number: "S1", status: "archived" }];
    const result = await executePermanentDeletion(mockSupabase, products);

    expect(result.deleted.length).toBe(1);
    expect(storageRemoveCalled).toBe(false);
    expect(result.deletedImagesCount).toBe(0);
    expect(
      result.storageCleanupErrors.some((e) =>
        e.includes("Failed to verify surviving outsole image references"),
      ),
    ).toBe(true);
    expect(
      result.storageCleanupErrors.some((e) =>
        e.includes("Reference check failed. Skipped Storage cleanup"),
      ),
    ).toBe(true);
  });

  it("fails closed and skips Storage removal if factory_gallery reference check query fails", async () => {
    let storageRemoveCalled = false;

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: (col: string) => {
                if (col === "outsole_id") {
                  return Promise.resolve({
                    data: [{ id: "img-1", outsole_id: "p1", file_path: "outsoles/p1/img.webp" }],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              },
            }),
          };
        }
        if (table === "factory_gallery") {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "factory_gallery service unavailable" },
                }),
            }),
          };
        }
        if (table === "factory_info_rows") {
          return {
            select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    Promise.resolve({
                      data: [{ id: "p1", name: "Sole", model_number: "S1" }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: () => {
            storageRemoveCalled = true;
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    };

    const products = [{ id: "p1", name: "Sole", model_number: "S1", status: "archived" }];
    const result = await executePermanentDeletion(mockSupabase, products);

    expect(result.deleted.length).toBe(1);
    expect(storageRemoveCalled).toBe(false);
    expect(
      result.storageCleanupErrors.some((e) =>
        e.includes("Failed to verify factory gallery image references"),
      ),
    ).toBe(true);
  });

  it("fails closed and skips Storage removal if factory_info_rows reference check query fails", async () => {
    let storageRemoveCalled = false;

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: (col: string) => {
                if (col === "outsole_id") {
                  return Promise.resolve({
                    data: [{ id: "img-1", outsole_id: "p1", file_path: "outsoles/p1/img.webp" }],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              },
            }),
          };
        }
        if (table === "factory_gallery") {
          return {
            select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
          };
        }
        if (table === "factory_info_rows") {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "factory_info_rows rate limited" },
                }),
            }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    Promise.resolve({
                      data: [{ id: "p1", name: "Sole", model_number: "S1" }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: () => {
            storageRemoveCalled = true;
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    };

    const products = [{ id: "p1", name: "Sole", model_number: "S1", status: "archived" }];
    const result = await executePermanentDeletion(mockSupabase, products);

    expect(result.deleted.length).toBe(1);
    expect(storageRemoveCalled).toBe(false);
    expect(
      result.storageCleanupErrors.some((e) =>
        e.includes("Failed to verify factory info image references"),
      ),
    ).toBe(true);
  });

  it("preserves images shared with surviving outsole_images, factory_gallery, or factory_info_rows", async () => {
    const storageRemovedPaths: string[] = [];

    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: (col: string) => {
                if (col === "outsole_id") {
                  return Promise.resolve({
                    data: [
                      { id: "i1", outsole_id: "p-arch-1", file_path: "shared/outsole-tread.webp" },
                      { id: "i2", outsole_id: "p-arch-1", file_path: "shared/factory-banner.webp" },
                      { id: "i3", outsole_id: "p-arch-1", file_path: "shared/info-diagram.webp" },
                      { id: "i4", outsole_id: "p-arch-1", file_path: "unique/sole-exclusive.webp" },
                    ],
                    error: null,
                  });
                }
                if (col === "file_path") {
                  // Another surviving product in outsole_images still references "shared/outsole-tread.webp"
                  return Promise.resolve({
                    data: [{ file_path: "shared/outsole-tread.webp" }],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              },
            }),
          };
        }
        if (table === "factory_gallery") {
          return {
            select: () => ({
              in: () =>
                // factory_gallery references "shared/factory-banner.webp"
                Promise.resolve({
                  data: [{ image_path: "shared/factory-banner.webp" }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "factory_info_rows") {
          return {
            select: () => ({
              in: () =>
                // factory_info_rows references "shared/info-diagram.webp"
                Promise.resolve({
                  data: [{ image_path: "shared/info-diagram.webp" }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    Promise.resolve({
                      data: [{ id: "p-arch-1", name: "Sole", model_number: "S1" }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: (paths: string[]) => {
            storageRemovedPaths.push(...paths);
            return Promise.resolve({ data: paths, error: null });
          },
        }),
      },
    };

    const products = [{ id: "p-arch-1", name: "Sole", model_number: "S1", status: "archived" }];
    const result = await executePermanentDeletion(mockSupabase, products);

    expect(result.deleted.length).toBe(1);
    // ONLY unique/sole-exclusive.webp should be removed! All 3 shared images must be preserved.
    expect(storageRemovedPaths).toEqual(["unique/sole-exclusive.webp"]);
    expect(result.deletedImagesCount).toBe(1);
    expect(result.storageCleanupErrors.length).toBe(0);
  });
});

describe("Storage Deletion Failure After Database Deletion", () => {
  it("handles storage API failure gracefully without rolling back database deletion", async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === "outsole_images") {
          return {
            select: () => ({
              in: (col: string) => {
                if (col === "outsole_id") {
                  return Promise.resolve({
                    data: [{ id: "i1", outsole_id: "p1", file_path: "outsoles/p1/img.webp" }],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              },
            }),
          };
        }
        if (table === "factory_gallery" || table === "factory_info_rows") {
          return {
            select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
          };
        }
        if (table === "outsoles") {
          return {
            delete: () => ({
              in: () => ({
                eq: () => ({
                  select: () =>
                    Promise.resolve({
                      data: [{ id: "p1", name: "Sole", model_number: "S1" }],
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from: () => ({
          remove: () => Promise.resolve({ error: { message: "Storage network timeout" } }),
        }),
      },
    };

    const products = [{ id: "p1", name: "Sole", model_number: "S1", status: "archived" }];
    const result = await executePermanentDeletion(mockSupabase, products);

    // Database deletion succeeded
    expect(result.deleted.length).toBe(1);
    // Storage cleanup error was reported clearly with path needing manual cleanup
    expect(result.storageCleanupErrors.length).toBe(1);
    expect(result.storageCleanupErrors[0]).toContain(
      "Storage cleanup failed for 1 file(s): Storage network timeout",
    );
    expect(result.storageCleanupErrors[0]).toContain("outsoles/p1/img.webp");
    // Ensure no sensitive tokens/headers appear in message
    expect(result.storageCleanupErrors[0]).not.toContain("Bearer");
    expect(result.storageCleanupErrors[0]).not.toContain("service_role");
  });
});

describe("M-2: Bulk Input ID Deduplication", () => {
  it("deduplicates redundant IDs in bulk requests to ensure unique counts", () => {
    const rawIds = [
      "123e4567-e89b-12d3-a456-426614174000",
      "123e4567-e89b-12d3-a456-426614174000",
      "987fcdeb-51a2-43f7-9876-ba0987654321",
      "123e4567-e89b-12d3-a456-426614174000",
    ];

    const uniqueIds = Array.from(new Set(rawIds));
    expect(uniqueIds.length).toBe(2);
    expect(uniqueIds).toEqual([
      "123e4567-e89b-12d3-a456-426614174000",
      "987fcdeb-51a2-43f7-9876-ba0987654321",
    ]);
  });
});

describe("M-1: Partial-Success and Failure UI Reporting Logic", () => {
  function formatDeletionFeedback(
    deletedCount: number,
    rejectedCount: number,
    warnings?: string[],
  ) {
    if (deletedCount === 0) {
      return {
        type: "error" as const,
        message: `No products were deleted.${rejectedCount > 0 ? ` (${rejectedCount} product${rejectedCount === 1 ? " was" : "s were"} ineligible or skipped.)` : ""}`,
      };
    }

    if (warnings && warnings.length > 0) {
      let partialMsg = `Database record${deletedCount === 1 ? "" : "s"} permanently deleted (${deletedCount} product${deletedCount === 1 ? "" : "s"}), but Storage cleanup encountered an issue: ${warnings.join("; ")}`;
      if (rejectedCount > 0) {
        partialMsg += ` (${rejectedCount} product${rejectedCount === 1 ? " was" : "s were"} ineligible or skipped.)`;
      }
      return {
        type: "warning" as const,
        message: partialMsg,
      };
    }

    let msg = `Permanently deleted ${deletedCount} product${deletedCount === 1 ? "" : "s"}.`;
    if (rejectedCount > 0) {
      msg += ` (${rejectedCount} product${rejectedCount === 1 ? " was" : "s were"} ineligible or skipped.)`;
    }
    return {
      type: "success" as const,
      message: msg,
    };
  }

  it("produces complete success message when all items succeed and no warnings exist", () => {
    const feedback = formatDeletionFeedback(3, 0);
    expect(feedback.type).toBe("success");
    expect(feedback.message).toBe("Permanently deleted 3 products.");
  });

  it("produces warning message and skips success banner when DB succeeds but Storage cleanup fails", () => {
    const feedback = formatDeletionFeedback(1, 0, [
      "Storage cleanup failed for 1 file(s): timeout. Paths requiring manual administrator cleanup: outsoles/p1/img.webp",
    ]);
    expect(feedback.type).toBe("warning");
    expect(feedback.message).toContain(
      "Database record permanently deleted (1 product), but Storage cleanup encountered an issue",
    );
    expect(feedback.message).toContain("outsoles/p1/img.webp");
  });

  it("produces error feedback when 0 products are deleted", () => {
    const feedback = formatDeletionFeedback(0, 2);
    expect(feedback.type).toBe("error");
    expect(feedback.message).toBe(
      "No products were deleted. (2 products were ineligible or skipped.)",
    );
  });

  it("accurately reports mixed bulk operations with both deleted and skipped products", () => {
    const feedback = formatDeletionFeedback(2, 1);
    expect(feedback.type).toBe("success");
    expect(feedback.message).toBe(
      "Permanently deleted 2 products. (1 product was ineligible or skipped.)",
    );
  });
});

describe("Zod Payload Validation", () => {
  const uuidSchema = z.object({
    id: z.string().uuid("Invalid product ID"),
  });
  const bulkIdsSchema = z.object({
    ids: z
      .array(z.string().uuid("Invalid product ID"))
      .min(1, "At least one product ID must be provided"),
  });

  it("validates correct UUIDs and rejects invalid or missing IDs", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(() => uuidSchema.parse({ id: validUuid })).not.toThrow();

    expect(() => uuidSchema.parse({ id: "invalid-id" })).toThrow("Invalid product ID");
    expect(() => uuidSchema.parse({})).toThrow();
  });

  it("validates bulk IDs array and rejects empty arrays", () => {
    const validUuid1 = "123e4567-e89b-12d3-a456-426614174000";
    const validUuid2 = "987fcdeb-51a2-43f7-9876-ba0987654321";

    expect(() => bulkIdsSchema.parse({ ids: [validUuid1, validUuid2] })).not.toThrow();
    expect(() => bulkIdsSchema.parse({ ids: [] })).toThrow(
      "At least one product ID must be provided",
    );
    expect(() => bulkIdsSchema.parse({ ids: ["not-a-uuid"] })).toThrow("Invalid product ID");
  });
});
