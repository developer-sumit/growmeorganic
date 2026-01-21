import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputNumber } from "primereact/inputnumber";
import type { ApiResponse, Artwork } from "./types";

function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedRows, setSelectedRows] = useState<Artwork[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(12);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectCount, setSelectCount] = useState<number | null>(null);
  const [selectInfo, setSelectInfo] = useState<string | null>(null);
  const [pendingSelectCount, setPendingSelectCount] = useState(0);
  const overlayRef = useRef<OverlayPanel>(null);
  const selectInputRef = useRef<HTMLInputElement | null>(null);

  const currentPage = useMemo(
    () => Math.floor(first / rows) + 1,
    [first, rows],
  );

  useEffect(() => {
    const fetchArtworks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<ApiResponse>(
          "https://api.artic.edu/api/v1/artworks",
          {
            params: {
              page: currentPage,
              limit: rows,
            },
          },
        );

        setArtworks(response.data.data ?? []);
        setTotalRecords(response.data.pagination?.total ?? 0);
      } catch (err) {
        setError("Failed to load artworks. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtworks();
  }, [currentPage, rows]);

  useEffect(() => {
    setSelectedRows(artworks.filter((item) => selectedIds.has(item.id)));
  }, [artworks, selectedIds]);

  useEffect(() => {
    if (pendingSelectCount <= 0 || artworks.length === 0) {
      return;
    }

    const selectedOnPage = artworks.filter((item) => selectedIds.has(item.id));
    const available = artworks.filter((item) => !selectedIds.has(item.id));
    const toSelect = available.slice(0, pendingSelectCount);

    if (toSelect.length === 0) {
      return;
    }

    const nextSelected = [...selectedOnPage, ...toSelect];
    updateSelectionForCurrentPage(nextSelected);
    setPendingSelectCount((prev) => prev - toSelect.length);
  }, [artworks, pendingSelectCount, selectedIds]);

  const allCurrentPageSelected = useMemo(() => {
    if (artworks.length === 0) {
      return false;
    }
    return artworks.every((item) => selectedIds.has(item.id));
  }, [artworks, selectedIds]);

  const updateSelectionForCurrentPage = (nextSelected: Artwork[]) => {
    const pageIds = new Set(artworks.map((item) => item.id));

    setSelectedIds((prev) => {
      const nextIds = new Set(prev);
      pageIds.forEach((id) => nextIds.delete(id));
      nextSelected.forEach((item) => nextIds.add(item.id));
      return nextIds;
    });

    setSelectedRows(nextSelected);
  };

  const handleSelectionChange = (value: Artwork[] | Artwork | null) => {
    const nextSelection = Array.isArray(value) ? value : value ? [value] : [];
    updateSelectionForCurrentPage(nextSelection);
  };

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      updateSelectionForCurrentPage([...artworks]);
      return;
    }
    updateSelectionForCurrentPage([]);
  };

  const handlePageChange = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const resolveSelectCount = () => {
    if (selectCount && selectCount > 0) {
      return selectCount;
    }

    const rawValue = selectInputRef.current?.value?.trim() ?? "";
    const parsed = Number(rawValue);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return null;
  };

  const handleSelect = () => {
    const count = resolveSelectCount();
    if (!count) {
      setSelectInfo("Enter number of rows to select across all pages");
      return;
    }

    const safeCount = Math.min(count, artworks.length);
    const nextSelected = artworks.slice(0, safeCount);

    const remaining = count - safeCount;
    if (remaining > 0) {
      setPendingSelectCount(remaining);
      setSelectInfo("Selecting remaining rows");
    } else {
      setPendingSelectCount(0);
      setSelectInfo(null);
    }

    updateSelectionForCurrentPage(nextSelected);
    overlayRef.current?.hide();
    setSelectCount(null);
  };

  return (
    <div className="app">
      <div className="table-meta">
        <span className="status">
          Selected: {selectedIds.size} row{selectedIds.size === 1 ? "" : "s"}
        </span>
      </div>

      {error && <div className="status status-error">{error}</div>}

      <div className="table-card">
        <DataTable
          value={artworks}
          dataKey="id"
          lazy
          paginator
          paginatorTemplate={{
            layout: "CurrentPageReport PrevPageLink PageLinks NextPageLink",
            PrevPageLink: (options) => (
              <button
                type="button"
                className={options.className}
                onClick={options.onClick}
                disabled={options.disabled}
              >
                Previous
              </button>
            ),
            NextPageLink: (options) => (
              <button
                type="button"
                className={options.className}
                onClick={options.onClick}
                disabled={options.disabled}
              >
                Next
              </button>
            ),
          }}
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          first={first}
          rows={rows}
          totalRecords={totalRecords}
          onPage={handlePageChange}
          loading={loading}
          className="artworks-table"
          selection={selectedRows}
          selectionMode="multiple"
          onSelectionChange={(event) =>
            handleSelectionChange(event.value as Artwork[] | Artwork | null)
          }
          showSelectAll={false}
          stripedRows
          rowHover
        >
          <Column
            selectionMode="multiple"
            headerStyle={{ width: "4.5rem" }}
            header={
              <div className="selection-header">
                <Checkbox
                  checked={allCurrentPageSelected}
                  onChange={(event) =>
                    handleSelectAllChange(event.checked ?? false)
                  }
                />
                <Button
                  type="button"
                  icon="pi pi-chevron-down"
                  className="p-button-text p-button-sm selection-toggle"
                  onClick={(event) => overlayRef.current?.toggle(event)}
                />
                <OverlayPanel ref={overlayRef}>
                  <div className="overlay-content">
                    <span className="status">Select Multiple Rows</span>
                    <InputNumber
                      value={selectCount ?? undefined}
                      onValueChange={(event) =>
                        setSelectCount(event.value ?? null)
                      }
                      inputRef={selectInputRef}
                      min={1}
                      max={artworks.length}
                      useGrouping={false}
                      placeholder="e.g. 20"
                    />
                    <div className="toolbar">
                      <Button
                        type="button"
                        label="Select"
                        onClick={handleSelect}
                      />
                    </div>
                    {selectInfo && (
                      <span className="helper-text">{selectInfo}</span>
                    )}
                  </div>
                </OverlayPanel>
              </div>
            }
          />
          <Column field="title" header="TITLE" />
          <Column field="place_of_origin" header="PLACE OF ORIGIN" />
          <Column field="artist_display" header="ARTIST" />
          <Column field="inscriptions" header="INSCRIPTIONS" />
          <Column field="date_start" header="START DATE" />
          <Column field="date_end" header="END DATE" />
        </DataTable>
      </div>

      <div className="portfolio-note">
        <span>
          Want to see more? Visit&nbsp;
          <a
            href="https://sumitrathore.web.app"
            target="_blank"
            rel="noreferrer"
          >
            https://sumitrathore.web.app
          </a>
          &nbsp;and check my work, or google “Sumit Singh Rathore”.
        </span>
      </div>
    </div>
  );
}

export default App;
