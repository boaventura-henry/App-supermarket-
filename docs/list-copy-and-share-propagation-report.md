# List Copy and Share Propagation Report

## Summary

This change adds two list-management flows to the SuperList web app:

- Copy one owned shopping list with its products and existing share permissions.
- Apply the share configuration from one owned list to all other owned lists.

It also adjusts the profile photo selector on mobile so the user can choose from the gallery or use the camera explicitly.

## Scope

Changed frontend and Supabase service logic only.

No database migration was added.
No RLS policy was changed.
No Android/native code was changed.
No secrets or environment values were changed.

## Copy List

The copy action is available on owned list cards.

When the user confirms the copy:

- A new `shopping_lists` row is created for the logged user.
- The new list name uses the original name with the suffix `- Copia`.
- Products from the original list are copied to the new list.
- Existing shares from the original list are copied to the new list.
- `price_history` is not copied.

The copied products keep:

- name
- brand
- quantity
- unit price
- supermarket
- purchased status
- sort order

The copied shares keep:

- shared user
- permission (`viewer` or `editor`)

Self-shares and duplicated share targets are ignored.

## Apply Shares To All Lists

The "Compartilhamentos" screen now includes an action to apply the selected list's share configuration to all other owned lists.

Rules:

- Only owned lists are affected.
- The source list is not modified.
- Existing target shares are updated when permission differs.
- Missing target shares are created.
- Duplicates and self-shares are ignored.
- Shared lists received from other users are not affected.

The operation reports:

- updated lists
- created shares
- updated shares
- ignored users

## Profile Photo Mobile Fix

The profile photo form now offers two explicit actions:

- Choose from gallery.
- Take photo.

The gallery action does not use the `capture` attribute, so mobile browsers can open the file picker/gallery normally.
The camera action keeps `capture="environment"` for users who want to take a new photo.

## Files Changed

- `src/App.tsx`
- `src/services/shareApi.ts`
- `docs/list-copy-and-share-propagation-report.md`

## Manual Test Checklist

1. Create a list with products.
2. Share the list with another user.
3. Click copy on the owned list card.
4. Confirm that a new list appears.
5. Confirm that copied products appear in the new list.
6. Confirm that copied shares exist for the new list.
7. Confirm that price history was not duplicated.
8. Open "Compartilhar Listas".
9. Select a list with shares.
10. Click "Aplicar a todas as listas".
11. Confirm that the same users and permissions were applied to other owned lists.
12. Open profile on mobile.
13. Confirm that gallery selection and camera capture are available as separate actions.

## Known Notes

The operations depend on existing Supabase RLS policies for:

- `shopping_lists`
- `products`
- `list_shares`

No new policy is required by this change if the current owner policies already allow owners to insert lists, products, and share rows for their own data.
