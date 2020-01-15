import React, { useEffect, useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { useHistory } from "react-router-dom";

import entryPreview from '../utils/entryPreview';
import getCsrfToken from '../utils/getCsrfToken';

const listQuery = `
  query($first: Int, $after: String) {
    entryList: entries(first: $first, after: $after) {
      edges {
        id
        text
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const createQuery = `
  mutation createEntry($text: String!) {
      entry: createEntry(text: $text) {
        id
      }
    }
`;

interface EntryPreview {
  id: string;
  preview: string;
}

interface Entry {
  id: string;
  text: string;
}

interface Patch {
  [key: string]: {
    text: string
  }
}

interface EntryListExperienceConnectorProps {
  children: (arg0: EntryEditorExperienceConnectorRenderProps) => React.ReactElement;
  patches?: Patch;
}

interface EntryEditorExperienceConnectorRenderProps {
  entries: EntryPreview[];
  isEntriesLoading: boolean;
  onClickNew: () => void;
  onClickMore: () => void;
  showNextButton: boolean;
}


const baseUrl = '/api/entry/';
const csrfToken = getCsrfToken();
const client = new GraphQLClient(baseUrl, {
  headers: {
    'CSRF-Token': csrfToken,
  }
});

export default function EntryListExperienceConnector({ children, patches }: EntryListExperienceConnectorProps) {
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [isEntriesLoading, setIsEntriesLoaded] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState();
  const history = useHistory();

  useEffect(() => {
    async function fetchEntries() {
      setIsEntriesLoaded(true);
      const { entryList } = await client.request(listQuery, {
        first: 10
      });
      const { edges, pageInfo } = entryList;
      setEntries(edges.map((entry: Entry) => ({
        id: entry.id,
        preview: entryPreview(entry.text)
      })));
      setHasNextPage(pageInfo.hasNextPage);setNextCursor
      setNextCursor(pageInfo.endCursor);
      setIsEntriesLoaded(false);
    }
    fetchEntries();
  }, []);

  async function onClickNew() {
    const { entry } = await client.request(createQuery, {
      text: '',
    });

    history.push(`/workspace/${entry.id}`)
  }

  async function onClickMore() {
    const { entryList } = await client.request(listQuery, {
      first: 10,
      after: nextCursor,
    });
    const { edges, pageInfo } = entryList;
    const nextEntries = edges.map((entry: Entry) => ({
      id: entry.id,
      preview: entryPreview(entry.text)
    }))
    setEntries(entries => [...entries, ...nextEntries]);
    setHasNextPage(pageInfo.hasNextPage); setNextCursor
    setNextCursor(pageInfo.endCursor);
  }

  const patchedEntries = entries.map((entry: EntryPreview) => {
    if (patches?.[entry.id]) {
      return { ...entry, preview: entryPreview(patches?.[entry.id]?.text) }
    }
    return entry;
  });

  return children({
    entries: patchedEntries,
    isEntriesLoading,
    onClickNew,
    onClickMore,
    showNextButton: hasNextPage,
  });
}
